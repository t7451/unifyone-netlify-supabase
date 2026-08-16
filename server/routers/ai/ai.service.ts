/**
 * ai.service.ts — use-cases for the Kai AI router.
 *
 * Houses the Kai chat orchestration: credit-allowance gating, LLM/agent
 * invocation, credit-metering debit, and conversation persistence. The order
 * of `checkKaiCreditAllowance` → LLM/agent invocation → `debitKaiCreditUsage`
 * → persistence is load-bearing and preserved exactly as in the original
 * router.
 */

import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import type { TrpcContext } from "../../_core/context";
import { getDb } from "../../db";
import {
  freeFirstChain,
  GROQ_FALLBACK_MODEL,
  invokeLLM,
} from "../../_core/llm";
import {
  improveResponse,
  resolveQualityMode,
  withQualityContract,
  type QualityMode,
} from "../../lib/aiResponseFramework";
import { mcpClient } from "../../lib/mcpClient";
import {
  buildKaiChatMeterMetadata,
  getKaiModelCatalogForClient,
  isFreeKaiModel,
  resolveKaiModel,
} from "../../lib/kaiModels";
import { getUserProviderKey } from "../../lib/userApiKeys";
import {
  buildKaiUsageLedgerIdempotencyKey,
  checkKaiCreditAllowance,
  debitKaiCreditUsage,
  toKaiLedgerCreditAmount,
} from "../../lib/kaiCreditGuard";
import {
  CONTEXT_PROMPTS,
  CONTEXT_SUGGESTIONS,
  KAI_BASE_DIRECTIVES,
  KAI_CHAT_MAX_TOKENS,
  KAI_IN_SCOPE_GUIDANCE,
  recoverKaiGenericRefusal,
} from "./ai.prompts";
import {
  insertConversation,
  listConversations as repoListConversations,
  loadExistingMessages,
  updateConversationMessages,
  getConversation as repoGetConversation,
  deleteConversation as repoDeleteConversation,
  clearAllConversations as repoClearAllConversations,
  type ConvoMessage,
} from "./ai.repo";

// Re-export conversation CRUD use-cases (thin pass-through to the repo).
export const listConversations = repoListConversations;
export const getConversation = repoGetConversation;
export const deleteConversation = repoDeleteConversation;
export const clearAllConversations = repoClearAllConversations;

/** List Kai model choices clients are allowed to request. */
export function listModels() {
  return { models: getKaiModelCatalogForClient() };
}

/** Get context-aware suggested prompts for the current page — Kai */
export function getSuggestions(context: string) {
  const suggestions =
    CONTEXT_SUGGESTIONS[context] ?? CONTEXT_SUGGESTIONS.general;
  return { suggestions, context };
}

// Mirrors the ctx shape `tenantProcedure` produces: the Express req/res carried
// on `TrpcContext` (needed for the moneyManager caller cast below) plus a
// guaranteed non-null `tenantId`. `user` stays `User | null` as the handler
// sees it; the runtime null guard below preserves the original behavior.
type ChatCtx = TrpcContext & { tenantId: number };

type ChatInput = {
  message: string;
  context: string;
  conversationId?: number;
  model?: Parameters<typeof resolveKaiModel>[0];
  dataContext?: string;
  /** Response quality mode — fast | standard | high. */
  quality?: QualityMode;
};

/** Send a message and get an AI response — persists to conversation history. */
export async function chat(ctx: ChatCtx, input: ChatInput) {
  try {
    const user = ctx.user;
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    const selectedModel = resolveKaiModel(input.model);
    const kaiUsageRequestId = randomUUID();
    const meterMetadata = buildKaiChatMeterMetadata(selectedModel, input.model);
    // BYOK: when the user stored their own OpenRouter key, route every
    // call through it and never gate on or debit Kai credits.
    const byokKey = await getUserProviderKey(Number(user.id), "openrouter");
    // Free-tier models are available to everyone, always, at zero credits.
    const isUnmetered = isFreeKaiModel(selectedModel) || Boolean(byokKey);
    // Free / unmetered (no BYOK): burn Groq → Gemini free quota first.
    // Premium selections keep their catalog chain.
    const llmModel =
      isFreeKaiModel(selectedModel) && !byokKey
        ? `groq/${GROQ_FALLBACK_MODEL}`
        : selectedModel.gatewayModel;
    const llmModelChain =
      isFreeKaiModel(selectedModel) && !byokKey
        ? freeFirstChain(
            selectedModel.gatewayModel,
            ...selectedModel.fallbackModels
          )
        : selectedModel.fallbackModels;
    const creditAllowance = isUnmetered
      ? {
          allowed: true as const,
          minimumCredits: 0,
          minimumLedgerCredits: 0,
          balance: null,
          enforcement: "neon" as const,
        }
      : await checkKaiCreditAllowance({
          tenantId: ctx.tenantId,
          userId: user.id,
          minimumCredits: selectedModel.minimumCredits,
          openId: user.openId,
        });
    if (!creditAllowance.allowed) {
      throw new TRPCError({
        code:
          creditAllowance.enforcement === "neon"
            ? "FORBIDDEN"
            : "SERVICE_UNAVAILABLE",
        message:
          creditAllowance.reason ??
          "Insufficient Kai credits for the selected model.",
      });
    }

    // Build system prompt with optional data context + live MCP data
    const baseSystemPrompt =
      CONTEXT_PROMPTS[input.context] ?? CONTEXT_PROMPTS.general;

    // Enrich with real shift data from getKaiContext for gig-related pages.
    // This is what makes Kai answer in actual dollars instead of generalities.
    let mcpContext = "";
    if (["money-manager", "gig-command", "dashboard"].includes(input.context)) {
      try {
        const { moneyManagerRouter } = await import("../moneyManager");
        // Call getKaiContext server-side via the router caller (no HTTP roundtrip)
        const caller = moneyManagerRouter.createCaller(
          ctx as Parameters<typeof moneyManagerRouter.createCaller>[0]
        );
        const kaiCtx = await caller
          .getKaiContext({
            context: input.context as
              | "gig-command"
              | "money-manager"
              | "dashboard",
          })
          .catch(() => null);
        if (kaiCtx?.hasSufficientData) {
          mcpContext = `\n\nUser's actual gig performance data (use these exact numbers in your response):\n${kaiCtx.contextJson}`;
        }
      } catch {
        // Non-blocking — Kai still works without live shift data
        try {
          const analytics = await mcpClient.getAnalytics(
            ctx.tenantId ? String(ctx.tenantId) : undefined
          );
          if (analytics) {
            mcpContext = `\n\nPlatform analytics:\n${JSON.stringify(analytics, null, 2)}`;
          }
        } catch {
          /* silently skip */
        }
      }
    }

    const qualityMode = resolveQualityMode(input.quality, {
      premiumModel: !isFreeKaiModel(selectedModel),
    });

    const systemPrompt = withQualityContract(
      [
        baseSystemPrompt,
        KAI_BASE_DIRECTIVES,
        KAI_IN_SCOPE_GUIDANCE,
        input.dataContext
          ? `\nUser-provided context:\n${input.dataContext}`
          : "",
        mcpContext,
      ]
        .filter(Boolean)
        .join("\n")
    );

    // Load or create conversation
    let conversationId = input.conversationId;
    let existingMessages: ConvoMessage[] = [];

    if (conversationId && db) {
      existingMessages = await loadExistingMessages(
        db,
        user.id,
        conversationId
      );
    }

    // Build LLM message history (last 20 turns to stay within context window)
    const historyMessages = existingMessages.slice(-20).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const llmMessages = [
      { role: "system" as const, content: systemPrompt },
      ...historyMessages,
      { role: "user" as const, content: input.message },
    ];

    // Call LLM with error handling + credit metering.
    // For data-rich contexts, run the agentic loop so Kai can call MCP tools.
    let assistantContent: string;
    let actualModel: string | null = null;
    let estimatedCredits = 0;
    let chargedCredits = 0;
    let balanceAfter: number | null = null;
    let meteringSuccess: boolean | undefined;
    let meteringError: string | undefined;
    let toolCallCount = 0;
    let llmSucceeded = false;
    let kaiResponseId: string | null = null;
    let kaiDebitChargedCredits: number | null = null;
    let kaiDebitIdempotencyKey: string | null = null;
    let kaiDebitApplied: boolean | null = null;
    let agentToolCalls: Array<{ name: string; error?: string }> = [];
    let agentModelUsage: Array<{
      actualModel?: string;
      chargedCredits?: number;
      estimatedCredits?: number;
      responseId?: string;
    }> = [];
    // All contexts run the agentic loop so Kai can use MCP tools and the
    // run_code sandbox anywhere; models that don't need tools simply
    // answer in one iteration.
    const useAgent = true;
    try {
      if (useAgent) {
        const { runKaiAgent } = await import("../../lib/kaiAgent");
        const agentResult = await runKaiAgent({
          messages: llmMessages,
          user: {
            id: user.id,
            tenantId: ctx.tenantId,
          },
          maxIterations: 4,
          model: llmModel,
          modelChain: llmModelChain,
          // Keep replies snappy: large free-tier models are slow, and
          // Netlify function + browser timeouts bound the whole exchange.
          maxTokens: KAI_CHAT_MAX_TOKENS,
          providerApiKey: byokKey ?? undefined,
          meterSource: "ai_chat",
          meterAction: `kai.chat:${input.context}`,
          creditMultiplier: isUnmetered ? 0 : selectedModel.creditMultiplier,
          minimumCredits: isUnmetered ? 0 : selectedModel.minimumCredits,
          meterMetadata,
          awaitMetering: true,
          meterRequestId: kaiUsageRequestId,
        });
        assistantContent = agentResult.finalContent;
        llmSucceeded = true;
        toolCallCount = agentResult.toolCalls.length;
        agentToolCalls = agentResult.toolCalls.map(t => ({
          name: t.name,
          ...(t.error ? { error: t.error } : {}),
        }));
        agentModelUsage = agentResult.modelUsage.map(usage => ({
          actualModel: usage.actualModel,
          chargedCredits: usage.chargedCredits,
          estimatedCredits: usage.estimatedCredits,
          responseId: usage.responseId,
        }));
        const lastUsage =
          agentResult.modelUsage[agentResult.modelUsage.length - 1];
        actualModel = lastUsage?.actualModel ?? null;
        kaiResponseId = lastUsage?.responseId ?? null;
        estimatedCredits = agentResult.modelUsage.reduce(
          (sum, usage) => sum + (usage.estimatedCredits ?? 0),
          0
        );
        chargedCredits = agentResult.modelUsage.reduce(
          (sum, usage) => sum + (usage.chargedCredits ?? 0),
          0
        );
        balanceAfter = lastUsage?.balanceAfter ?? null;
        meteringSuccess = lastUsage?.success;
        meteringError = lastUsage?.error;
        if (agentResult.toolCalls.length > 0) {
          console.log(
            `[Kai] Agent used ${agentResult.toolCalls.length} tool calls in ${agentResult.iterations} iterations:`,
            agentResult.toolCalls.map(t => t.name).join(", ")
          );
        }
        const recovered = recoverKaiGenericRefusal(
          assistantContent,
          input.context
        );
        if (recovered) {
          assistantContent = recovered;
        }
      } else {
        const response = await invokeLLM({
          messages: llmMessages,
          model: llmModel,
          modelChain: llmModelChain,
          maxTokens: KAI_CHAT_MAX_TOKENS,
          providerApiKey: byokKey ?? undefined,
          meter: {
            userId: user.id,
            source: "ai_chat",
            action: `kai.chat:${input.context}`,
            tenantId: ctx.tenantId,
            creditMultiplier: isUnmetered ? 0 : selectedModel.creditMultiplier,
            minimumCredits: isUnmetered ? 0 : selectedModel.minimumCredits,
            metadata: meterMetadata,
            awaitResult: true,
            requestId: kaiUsageRequestId,
          },
        });
        llmSucceeded = true;
        kaiResponseId = response.id;
        actualModel = response.model;
        estimatedCredits = response.metering?.estimatedCredits ?? 0;
        chargedCredits = response.metering?.chargedCredits ?? 0;
        balanceAfter = response.metering?.balanceAfter ?? null;
        meteringSuccess = response.metering?.success;
        meteringError = response.metering?.error;
        const rawContent = response.choices[0]?.message?.content;
        assistantContent =
          typeof rawContent === "string"
            ? rawContent
            : "I'm sorry, I couldn't generate a response. Please try again.";
        const recovered = recoverKaiGenericRefusal(
          assistantContent,
          input.context
        );
        if (recovered) {
          assistantContent = recovered;
        }
      }
    } catch (llmError) {
      console.error(
        "[Kai] LLM invocation failed:",
        llmError instanceof Error ? llmError.message : String(llmError)
      );
      assistantContent =
        "I encountered a temporary issue processing your request. Please try again in a moment.";
    }

    // High-end response framework: polish + optional critique/refine.
    // Skipped on hard LLM failures. Free-tier refine uses Groq/Gemini chain.
    let qualityMeta: {
      score: number;
      improved: boolean;
      mode: QualityMode;
      issues: string[];
    } | null = null;
    if (
      llmSucceeded &&
      assistantContent &&
      !assistantContent.startsWith("I encountered a temporary issue")
    ) {
      try {
        const improved = await improveResponse({
          draft: assistantContent,
          userMessage: input.message,
          mode: qualityMode,
          contextLabel: input.context,
          expectNumbers: Boolean(mcpContext),
        });
        assistantContent = improved.content;
        qualityMeta = {
          score: improved.quality.score,
          improved: improved.improved,
          mode: improved.mode,
          issues: improved.quality.issues,
        };
      } catch (err) {
        console.warn("[Kai] response quality pass failed:", err);
      }
    }

    if (llmSucceeded && !isUnmetered) {
      const creditsToDebit = Math.max(
        chargedCredits || 0,
        estimatedCredits || 0,
        selectedModel.minimumCredits
      );
      const ledgerCreditsToDebit = toKaiLedgerCreditAmount(creditsToDebit);
      const debitIdempotencyKey = buildKaiUsageLedgerIdempotencyKey({
        tenantId: ctx.tenantId,
        userId: user.id,
        responseId: kaiResponseId,
        requestId: kaiUsageRequestId,
      });
      try {
        const debit = await debitKaiCreditUsage({
          tenantId: ctx.tenantId,
          userId: user.id,
          credits: ledgerCreditsToDebit,
          idempotencyKey: debitIdempotencyKey,
          openId: user.openId,
          description: `Kai chat ${input.context} (${selectedModel.id})`,
          metadata: {
            context: input.context,
            requestedModel: input.model ?? null,
            selectedModel: selectedModel.id,
            gatewayModel: selectedModel.gatewayModel,
            actualModel,
            actualModels: agentModelUsage
              .map(usage => usage.actualModel)
              .filter(Boolean),
            estimatedCredits: estimatedCredits || selectedModel.minimumCredits,
            chargedCredits: ledgerCreditsToDebit,
            creditMultiplier: selectedModel.creditMultiplier,
            minimumCredits: selectedModel.minimumCredits,
            supabaseMeteringSuccess: meteringSuccess,
            supabaseMeteringError: meteringError,
            toolCallCount,
            toolCalls: agentToolCalls,
            responseId: kaiResponseId,
            requestId: kaiUsageRequestId,
          },
        });
        kaiDebitChargedCredits = debit.chargedCredits;
        kaiDebitIdempotencyKey = debit.idempotencyKey;
        kaiDebitApplied = debit.debited;
        balanceAfter = debit.balanceAfter;
      } catch (debitError) {
        console.error(
          "[Kai] Neon credit debit failed:",
          debitError instanceof Error ? debitError.message : String(debitError)
        );
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message:
            debitError instanceof Error
              ? `Kai credit debit failed: ${debitError.message}`
              : "Kai credit debit failed",
        });
      }
    } else {
      balanceAfter = creditAllowance.balance;
    }

    // Persist conversation
    const now = Date.now();
    const userMsg: ConvoMessage = {
      role: "user",
      content: input.message,
      timestamp: now,
    };
    const assistantMsg: ConvoMessage = {
      role: "assistant",
      content: assistantContent,
      timestamp: now + 1,
    };
    const updatedMessages = [...existingMessages, userMsg, assistantMsg];

    // Auto-generate title from first user message
    const title =
      existingMessages.length === 0
        ? input.message.slice(0, 80) + (input.message.length > 80 ? "…" : "")
        : undefined;

    if (db) {
      if (conversationId) {
        await updateConversationMessages(
          db,
          user.id,
          conversationId,
          updatedMessages
        );
      } else {
        conversationId = await insertConversation(db, {
          userId: user.id,
          context: input.context,
          messages: updatedMessages,
          title: title ?? "New Conversation",
        });
      }
    }

    return {
      reply: assistantContent,
      quality: qualityMeta,
      conversationId,
      messageCount: updatedMessages.length,
      metadata: {
        model: {
          requested: input.model ?? null,
          selected: selectedModel.id,
          label: selectedModel.label,
          tier: selectedModel.tier,
          provider: selectedModel.provider,
          gatewayModel: selectedModel.gatewayModel,
          actual: actualModel,
          fallbackModels: selectedModel.fallbackModels,
        },
        credits: {
          unmetered: isUnmetered,
          byok: Boolean(byokKey),
          minimum: selectedModel.minimumCredits,
          multiplier: selectedModel.creditMultiplier,
          estimated: estimatedCredits || selectedModel.minimumCredits,
          charged: (kaiDebitChargedCredits ?? chargedCredits) || null,
          balanceBefore: creditAllowance.balance,
          balanceAfter,
          enforcement: creditAllowance.enforcement,
          ledgerDebited: kaiDebitApplied,
          ledgerIdempotencyKey: kaiDebitIdempotencyKey,
          meteringSuccess,
          meteringError,
        },
        toolCallCount,
      },
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    console.error(
      "[Kai] Chat mutation failed:",
      error instanceof Error ? error.message : String(error)
    );
    throw new Error("Failed to process chat message. Please try again.");
  }
}
