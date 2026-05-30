import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeLLMMock = vi.hoisted(() => vi.fn());

vi.mock("../../_core/llm", () => ({
  invokeLLM: invokeLLMMock,
  GROQ_FALLBACK_MODEL: "llama-3.3-70b-versatile",
  VERCEL_AI_GATEWAY_FALLBACK_MODEL: "openai/gpt-5.5",
}));

vi.mock("../../db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../../db";
import { aiRouter } from "../ai";

type LedgerRow = {
  id: number;
  tenantId: number;
  userId: number;
  type: string;
  creditDelta: number;
  idempotencyKey: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

const ctx = {
  user: {
    id: 7,
    email: "buyer@example.com",
    tenantId: 44,
    role: "user",
    openId: "openid",
  },
  req: {} as any,
  res: {} as any,
};

function collectWhereScope(whereClause: unknown) {
  const scope: { tenantId?: number; userId?: number } = {};
  let pendingColumn: "tenantId" | "userId" | null = null;

  function walk(value: unknown) {
    if (!value || typeof value !== "object") return;
    const record = value as Record<PropertyKey, unknown>;
    if (record.name === "tenantId" || record.name === "userId") {
      pendingColumn = record.name;
      return;
    }
    if (
      pendingColumn &&
      "value" in record &&
      typeof record.value === "number"
    ) {
      scope[pendingColumn] = record.value;
      pendingColumn = null;
      return;
    }
    if (Array.isArray(record.queryChunks)) {
      record.queryChunks.forEach(walk);
    }
    if (Array.isArray(record.value)) {
      record.value.forEach(walk);
    }
  }

  walk(whereClause);
  return scope;
}

function createAiDb(rows: LedgerRow[]) {
  let nextLedgerId = rows.length + 1;
  let nextConversationId = 100;
  const selectWhere = vi.fn((whereClause: unknown) => {
    const scope = collectWhereScope(whereClause);
    const remaining = rows
      .filter(
        row => row.tenantId === scope.tenantId && row.userId === scope.userId
      )
      .reduce((sum, row) => sum + row.creditDelta, 0);
    return Promise.resolve([{ remaining }]);
  });
  const insertValues = vi.fn((value: Record<string, unknown>) => {
    const insertBuilder = {
      onConflictDoNothing: vi.fn(() => ({
        returning: vi.fn(() => {
          const idempotencyKey = String(value.idempotencyKey);
          if (rows.some(row => row.idempotencyKey === idempotencyKey)) {
            return Promise.resolve([]);
          }
          const inserted = {
            id: nextLedgerId++,
            tenantId: Number(value.tenantId),
            userId: Number(value.userId),
            type: String(value.type),
            creditDelta: Number(value.creditDelta),
            idempotencyKey,
            description:
              typeof value.description === "string"
                ? value.description
                : undefined,
            metadata: value.metadata as Record<string, unknown> | undefined,
          };
          rows.push(inserted);
          return Promise.resolve([{ id: inserted.id }]);
        }),
      })),
      returning: vi.fn(() => Promise.resolve([{ id: nextConversationId++ }])),
    };
    return insertBuilder;
  });

  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: selectWhere,
      })),
    })),
    insert: vi.fn(() => ({
      values: insertValues,
    })),
    __selectWhere: selectWhere,
    __insertValues: insertValues,
  };
}

function mockSuccessfulLlm(responseId = "resp-kai") {
  invokeLLMMock.mockResolvedValue({
    id: responseId,
    created: 1,
    model: "gemini-2.5-flash",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "Kai response" },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    metering: {
      estimatedCredits: 1,
      chargedCredits: 1,
      balanceAfter: 999,
      success: true,
    },
  });
}

function mockRefusalLlm(
  content = "Sorry, I can't help with that.",
  responseId = "resp-refusal"
) {
  invokeLLMMock.mockResolvedValue({
    id: responseId,
    created: 1,
    model: "gemini-2.5-flash",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    metering: {
      estimatedCredits: 1,
      chargedCredits: 1,
      balanceAfter: 999,
      success: true,
    },
  });
}

function mockSuccessfulLlmSequence(prefix = "resp-kai-stress") {
  let counter = 0;
  invokeLLMMock.mockImplementation(async () => {
    counter += 1;
    return {
      id: `${prefix}-${counter}`,
      created: counter,
      model: "gemini-2.5-flash",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: `Kai response ${counter}` },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      metering: {
        estimatedCredits: 1,
        chargedCredits: 1,
        balanceAfter: 999 - counter,
        success: true,
      },
    };
  });
}

describe("aiRouter Kai Neon credit enforcement", () => {
  beforeEach(() => {
    vi.mocked(getDb).mockReset();
    invokeLLMMock.mockReset();
  });

  it("allows chat when purchased Neon balance meets the selected model minimum", async () => {
    const rows: LedgerRow[] = [
      {
        id: 1,
        tenantId: 44,
        userId: 7,
        type: "purchase",
        creditDelta: 4,
        idempotencyKey: "purchase",
      },
    ];
    vi.mocked(getDb).mockResolvedValue(createAiDb(rows) as any);
    mockSuccessfulLlm("resp-allow");

    const caller = aiRouter.createCaller(ctx as any);
    const result = await caller.chat({
      message: "Help me plan",
      context: "general",
      model: "kai-fast",
    });

    expect(invokeLLMMock).toHaveBeenCalledOnce();
    expect(result.reply).toBe("Kai response");
    expect(result.metadata.credits).toMatchObject({
      balanceBefore: 4,
      charged: 1,
      balanceAfter: 3,
      enforcement: "neon",
      ledgerDebited: true,
    });
  });

  it("blocks insufficient Neon balance before calling the LLM", async () => {
    vi.mocked(getDb).mockResolvedValue(
      createAiDb([
        {
          id: 1,
          tenantId: 44,
          userId: 7,
          type: "purchase",
          creditDelta: 1,
          idempotencyKey: "purchase",
        },
      ]) as any
    );

    const caller = aiRouter.createCaller(ctx as any);
    await expect(
      caller.chat({
        message: "Use premium reasoning",
        context: "general",
        model: "kai-premium",
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Insufficient Kai credits for the selected model.",
    });
    expect(invokeLLMMock).not.toHaveBeenCalled();
  });

  it("records successful usage as a negative tenant/user-scoped ledger debit", async () => {
    const rows: LedgerRow[] = [
      {
        id: 1,
        tenantId: 44,
        userId: 7,
        type: "purchase",
        creditDelta: 5,
        idempotencyKey: "purchase",
      },
    ];
    vi.mocked(getDb).mockResolvedValue(createAiDb(rows) as any);
    mockSuccessfulLlm("resp-debit");

    const caller = aiRouter.createCaller(ctx as any);
    const result = await caller.chat({
      message: "Summarize my orders",
      context: "general",
      model: "kai-balanced",
    });

    const usageRows = rows.filter(row => row.type === "usage");
    expect(usageRows).toHaveLength(1);
    expect(usageRows[0]).toMatchObject({
      tenantId: 44,
      userId: 7,
      creditDelta: -2,
      idempotencyKey: "kai_chat_usage:44:7:resp-debit",
      description: "Kai chat general (kai-balanced)",
      metadata: {
        context: "general",
        requestedModel: "kai-balanced",
        selectedModel: "kai-balanced",
        gatewayModel: "claude-3-5-haiku",
        actualModel: "gemini-2.5-flash",
        chargedCredits: 2,
        responseId: "resp-debit",
      },
    });
    expect(result.metadata.credits).toMatchObject({
      charged: 2,
      balanceAfter: 3,
    });
  });

  it("does not double-debit a replayed response idempotency key", async () => {
    const rows: LedgerRow[] = [
      {
        id: 1,
        tenantId: 44,
        userId: 7,
        type: "purchase",
        creditDelta: 10,
        idempotencyKey: "purchase",
      },
    ];
    vi.mocked(getDb).mockResolvedValue(createAiDb(rows) as any);
    mockSuccessfulLlm("resp-replay");

    const caller = aiRouter.createCaller(ctx as any);
    await caller.chat({
      message: "First",
      context: "general",
      model: "kai-fast",
    });
    const replay = await caller.chat({
      message: "Replay",
      context: "general",
      model: "kai-fast",
    });

    expect(rows.filter(row => row.type === "usage")).toHaveLength(1);
    expect(replay.metadata.credits).toMatchObject({
      balanceBefore: 9,
      balanceAfter: 9,
      ledgerDebited: false,
      ledgerIdempotencyKey: "kai_chat_usage:44:7:resp-replay",
    });
  });

  it("ignores cross-tenant ledger rows for allowance and debit balance", async () => {
    const rows: LedgerRow[] = [
      {
        id: 1,
        tenantId: 44,
        userId: 7,
        type: "purchase",
        creditDelta: 2,
        idempotencyKey: "tenant-purchase",
      },
      {
        id: 2,
        tenantId: 45,
        userId: 7,
        type: "purchase",
        creditDelta: 100,
        idempotencyKey: "other-tenant-purchase",
      },
    ];
    vi.mocked(getDb).mockResolvedValue(createAiDb(rows) as any);
    mockSuccessfulLlm("resp-isolated");

    const caller = aiRouter.createCaller(ctx as any);
    const result = await caller.chat({
      message: "Stay isolated",
      context: "general",
      model: "kai-fast",
    });

    expect(result.metadata.credits).toMatchObject({
      balanceBefore: 2,
      balanceAfter: 1,
    });
    expect(rows.find(row => row.type === "usage")).toMatchObject({
      tenantId: 44,
      userId: 7,
      creditDelta: -1,
    });
  });

  it("stress: handles concurrent Kai chats with unique ledger debits", async () => {
    const rows: LedgerRow[] = [
      {
        id: 1,
        tenantId: 44,
        userId: 7,
        type: "purchase",
        creditDelta: 100,
        idempotencyKey: "stress-purchase",
      },
    ];
    vi.mocked(getDb).mockResolvedValue(createAiDb(rows) as any);
    mockSuccessfulLlmSequence();

    const caller = aiRouter.createCaller(ctx as any);
    const results = await Promise.all(
      Array.from({ length: 25 }, (_, index) =>
        caller.chat({
          message: `Stress chat ${index}`,
          context: "general",
          model: "kai-fast",
        })
      )
    );

    const usageRows = rows.filter(row => row.type === "usage");
    expect(results).toHaveLength(25);
    expect(invokeLLMMock).toHaveBeenCalledTimes(25);
    expect(usageRows).toHaveLength(25);
    expect(new Set(usageRows.map(row => row.idempotencyKey)).size).toBe(25);
    expect(usageRows.reduce((sum, row) => sum + row.creditDelta, 0)).toBe(-25);
    for (const row of usageRows) {
      expect(row).toMatchObject({
        tenantId: 44,
        userId: 7,
        type: "usage",
        creditDelta: -1,
      });
      expect(row.idempotencyKey).toMatch(/^kai_chat_usage:44:7:resp-kai-stress-/);
    }
    for (const result of results) {
      expect(result.reply).toMatch(/^Kai response /);
      expect(result.metadata.credits).toMatchObject({
        charged: 1,
        enforcement: "neon",
        ledgerDebited: true,
      });
    }
  });

  it("replaces generic refusal replies with an actionable Kai fallback message", async () => {
    const refusalVariants = [
      "Sorry, I can't help with that.",
      "I'm sorry, I cannot assist with that.",
    ];

    for (const [index, refusal] of refusalVariants.entries()) {
      const rows: LedgerRow[] = [
        {
          id: 1,
          tenantId: 44,
          userId: 7,
          type: "purchase",
          creditDelta: 5,
          idempotencyKey: `purchase-${index}`,
        },
      ];
      vi.mocked(getDb).mockResolvedValue(createAiDb(rows) as any);
      mockRefusalLlm(refusal, `resp-refusal-fallback-${index}`);

      const caller = aiRouter.createCaller(ctx as any);
      const result = await caller.chat({
        message: "Help me plan sales for next week",
        context: "dashboard",
        model: "kai-fast",
      });

      expect(result.reply).toContain("I can help with your dashboard workflow.");
      expect(result.reply).toContain("concrete action plan");
    }
  });

  it("fails closed when Neon is unavailable before production chat LLM work", async () => {
    vi.mocked(getDb).mockResolvedValue(null);

    const caller = aiRouter.createCaller(ctx as any);
    await expect(
      caller.chat({
        message: "Are credits available?",
        context: "general",
        model: "kai-fast",
      })
    ).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      message: "Kai credit ledger database is unavailable.",
    });
    expect(invokeLLMMock).not.toHaveBeenCalled();
  });
});
