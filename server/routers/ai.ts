import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { aiConversations } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { mcpClient } from "../lib/mcpClient";

// ─── Context-aware system prompts per page ──────────────────────────────────
// Kai is the UnifyOne AI sidekick — powered by UnifyAI (Cloudflare Workers MCP).
const CONTEXT_PROMPTS: Record<string, string> = {
  general: `You are Kai, the UnifyOne AI sidekick — powered by UnifyAI, a Cloudflare Workers MCP server with 18 live tools covering stores, orders, products, analytics, inventory, and more. You have direct access to the user's real platform data through MCP tool calls. Be concise, tactical, and data-specific. Always respond with actual numbers when data is available. Never give generic advice when specific data exists.`,
  dashboard: `You are Kai, the UnifyOne AI assistant. The user is viewing their main dashboard. Help them interpret KPIs, identify revenue trends, suggest next actions for their store, and surface any anomalies in their orders or inventory. Be data-driven and direct.`,
  "money-manager": `You are Kai, the UnifyOne AI assistant. The user is in the Money Manager — a gig economy financial hub. Help them optimize earnings, calculate tax deductions (IRS 2025 rate: $0.70/mile), analyze shift performance, set financial rules, and plan their income strategy. Be specific with numbers.`,
  "gig-command": `You are Kai, the UnifyOne AI assistant. The user is in Gig Command — their GPS-aware shift operations center. Help them optimize routes, identify high-demand zones, calculate per-hour earnings, and generate platform-specific shortcuts for DoorDash, Uber Eats, Instacart, etc. Be tactical and time-sensitive.`,
  achievements: `You are Kai, the UnifyOne AI assistant. The user is viewing their Gamification Hub. Help them understand how to earn more points, which challenges to prioritize, how to climb the leaderboard, and how to unlock rare achievements. Be motivating and specific.`,
  friends: `You are Kai, the UnifyOne AI assistant. The user is on the Social page. Help them find friends, send challenges, interpret the achievement feed, and strategize on winning active challenges. Be social and competitive in tone.`,
  automations: `You are Kai, the UnifyOne AI assistant. The user is in the Automations hub. Help them configure n8n workflows, Zapier hooks, and Mailchimp sequences. Suggest automation patterns for their specific business events (orders, leads, shifts). Be technical and precise.`,
  "mobile-automation": `You are Kai, the UnifyOne AI assistant. The user is in the Mobile Automation center. Help them configure n8n schedules, interpret deep link attribution data, review CAPI event logs, and optimize their Meta ad tracking pipeline. Be infrastructure-focused.`,
  social: `You are Kai, the UnifyOne AI assistant. The user is in the Social Media Suite. Help them craft platform-specific posts, schedule content, analyze engagement metrics, and grow their audience across Meta, Instagram, and TikTok. Be creative and data-aware.`,
  leads: `You are Kai, the UnifyOne AI assistant. The user is managing their leads pipeline. Help them qualify leads, draft outreach messages, suggest follow-up timing, and identify patterns in their conversion funnel. Be sales-focused and direct.`,
};

const CONTEXT_SUGGESTIONS: Record<string, string[]> = {
  general: [
    "What can UnifyOne help me with today?",
    "Summarize my business performance this week",
    "What should I focus on to grow revenue?",
  ],
  dashboard: [
    "What are my top 3 revenue opportunities right now?",
    "Which products need restocking?",
    "Show me a summary of this week's orders",
  ],
  "money-manager": [
    "How much have I earned this week across all platforms?",
    "What's my estimated tax deduction from mileage this month?",
    "Which platform is giving me the best $/hour rate?",
  ],
  "gig-command": [
    "What are the best zones to work in right now?",
    "Generate DoorDash shortcuts for my current city",
    "How can I improve my earnings per hour?",
  ],
  achievements: [
    "Which challenges should I prioritize to level up fastest?",
    "How many points do I need to reach the next level?",
    "What's the fastest way to unlock a Legendary achievement?",
  ],
  friends: [
    "Who should I challenge based on my current stats?",
    "How do I win the active challenge I'm in?",
    "What achievements are my friends close to unlocking?",
  ],
  automations: [
    "Suggest an n8n workflow for new order notifications",
    "How do I set up a Zapier hook for lead submissions?",
    "What automations would save me the most time?",
  ],
  "mobile-automation": [
    "Why are my CAPI events not showing deduplication?",
    "How do I set up a daily n8n schedule for reports?",
    "Explain my deep link attribution data",
  ],
  social: [
    "Write a product launch post for Instagram",
    "What's the best time to post for my audience?",
    "Generate a week of content for my store",
  ],
  leads: [
    "Draft a follow-up email for a qualified lead",
    "What's my lead-to-conversion rate this month?",
    "Which leads should I prioritize today?",
  ],
};

export const aiRouter = router({
  /** Get context-aware suggested prompts for the current page — Kai */
  getSuggestions: protectedProcedure
    .input(z.object({ context: z.string().default("general") }))
    .query(({ input }) => {
      const suggestions =
        CONTEXT_SUGGESTIONS[input.context] ?? CONTEXT_SUGGESTIONS.general;
      return { suggestions, context: input.context };
    }),

  /** List conversation history for the current user */
  listConversations: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { conversations: [] };
      const convos = await db
        .select({
          id: aiConversations.id,
          title: aiConversations.title,
          context: aiConversations.context,
          createdAt: aiConversations.createdAt,
          updatedAt: aiConversations.updatedAt,
        })
        .from(aiConversations)
        .where(eq(aiConversations.userId, ctx.user.id))
        .orderBy(desc(aiConversations.updatedAt))
        .limit(20);
      return { conversations: convos };
    }),

  /** Get a specific conversation with full message history */
  getConversation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [convo] = await db
        .select()
        .from(aiConversations)
        .where(
          and(
            eq(aiConversations.id, input.id),
            eq(aiConversations.userId, ctx.user.id)
          )
        )
        .limit(1);
      if (!convo) throw new Error("Conversation not found");
      return { conversation: convo };
    }),

  /** Send a message and get an AI response — persists to conversation history */
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(4000),
        context: z.string().default("general"),
        conversationId: z.number().optional(),
        /** Optional data context injected into the system prompt (e.g. current shift stats) */
        dataContext: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Build system prompt with optional data context + live MCP data
        const baseSystemPrompt =
          CONTEXT_PROMPTS[input.context] ?? CONTEXT_PROMPTS.general;

        // Enrich with real shift data from getKaiContext for gig-related pages.
        // This is what makes Kai answer in actual dollars instead of generalities.
        let mcpContext = "";
        if (
          ["money-manager", "gig-command", "dashboard"].includes(input.context)
        ) {
          try {
            const { moneyManagerRouter } = await import("./moneyManager");
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
                ctx.user.tenantId ? String(ctx.user.tenantId) : undefined
              );
              if (analytics) {
                mcpContext = `\n\nPlatform analytics:\n${JSON.stringify(analytics, null, 2)}`;
              }
            } catch {
              /* silently skip */
            }
          }
        }

        const systemPrompt = [
          baseSystemPrompt,
          input.dataContext
            ? `\nUser-provided context:\n${input.dataContext}`
            : "",
          mcpContext,
        ]
          .filter(Boolean)
          .join("\n");

        // Load or create conversation
        type ConvoMessage = {
          role: "user" | "assistant" | "system";
          content: string;
          timestamp: number;
        };
        let conversationId = input.conversationId;
        let existingMessages: ConvoMessage[] = [];

        if (conversationId && db) {
          const [existing] = await db
            .select()
            .from(aiConversations)
            .where(
              and(
                eq(aiConversations.id, conversationId),
                eq(aiConversations.userId, ctx.user.id)
              )
            )
            .limit(1);
          if (existing) {
            existingMessages = (existing.messages as ConvoMessage[]) ?? [];
          }
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
        const useAgent = ["dashboard", "money-manager", "gig-command"].includes(
          input.context
        );
        try {
          if (useAgent) {
            const { runKaiAgent } = await import("../lib/kaiAgent");
            const agentResult = await runKaiAgent({
              messages: llmMessages,
              user: {
                id: ctx.user.id,
                tenantId: ctx.user.tenantId ?? null,
              },
              maxIterations: 4,
              meterSource: "ai_chat",
              meterAction: `kai.chat:${input.context}`,
            });
            assistantContent = agentResult.finalContent;
            if (agentResult.toolCalls.length > 0) {
              console.log(
                `[Kai] Agent used ${agentResult.toolCalls.length} tool calls in ${agentResult.iterations} iterations:`,
                agentResult.toolCalls.map(t => t.name).join(", ")
              );
            }
          } else {
            const response = await invokeLLM({
              messages: llmMessages,
              meter: {
                userId: ctx.user.id,
                source: "ai_chat",
                action: `kai.chat:${input.context}`,
                tenantId: ctx.user.tenantId ?? undefined,
              },
            });
            const rawContent = response.choices[0]?.message?.content;
            assistantContent =
              typeof rawContent === "string"
                ? rawContent
                : "I'm sorry, I couldn't generate a response. Please try again.";
          }
        } catch (llmError) {
          console.error(
            "[Kai] LLM invocation failed:",
            llmError instanceof Error ? llmError.message : String(llmError)
          );
          assistantContent =
            "I encountered a temporary issue processing your request. Please try again in a moment.";
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
            ? input.message.slice(0, 80) +
              (input.message.length > 80 ? "…" : "")
            : undefined;

        if (db) {
          if (conversationId) {
            await db
              .update(aiConversations)
              .set({ messages: updatedMessages, updatedAt: new Date() })
              .where(
                and(
                  eq(aiConversations.id, conversationId),
                  eq(aiConversations.userId, ctx.user.id)
                )
              );
          } else {
            const [inserted] = await db
              .insert(aiConversations)
              .values({
                userId: ctx.user.id,
                context: input.context,
                messages: updatedMessages,
                title: title ?? "New Conversation",
              })
              .returning({ id: aiConversations.id });
            conversationId = inserted?.id;
          }
        }

        return {
          reply: assistantContent,
          conversationId,
          messageCount: updatedMessages.length,
        };
      } catch (error) {
        console.error(
          "[Kai] Chat mutation failed:",
          error instanceof Error ? error.message : String(error)
        );
        throw new Error("Failed to process chat message. Please try again.");
      }
    }),

  /** Delete a conversation */
  deleteConversation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .delete(aiConversations)
        .where(
          and(
            eq(aiConversations.id, input.id),
            eq(aiConversations.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  /** Clear all conversations for the current user */
  clearAllConversations: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db
      .delete(aiConversations)
      .where(eq(aiConversations.userId, ctx.user.id));
    return { success: true };
  }),
});
