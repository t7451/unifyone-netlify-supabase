import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./mcpClient", () => ({
  mcpListTools: vi.fn().mockResolvedValue([
    {
      name: "getRevenueByDay",
      description: "Get revenue by day",
      inputSchema: {
        type: "object",
        properties: { tenantId: { type: "string" } },
      },
    },
    {
      name: "getLowStockProducts",
      description: "Get low stock products",
      inputSchema: { type: "object" },
    },
  ]),
  mcpCallTool: vi.fn(),
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { runKaiAgent } from "./kaiAgent";
import { invokeLLM } from "../_core/llm";
import { mcpCallTool } from "./mcpClient";

describe("runKaiAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns terminal content without tool calls", async () => {
    (invokeLLM as any).mockResolvedValueOnce({
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "Hello!" },
          finish_reason: "stop",
        },
      ],
    });
    const out = await runKaiAgent({
      messages: [{ role: "user", content: "hi" }],
      user: { id: 1, tenantId: "tenant-A" },
    });
    expect(out.finalContent).toBe("Hello!");
    expect(out.toolCalls).toHaveLength(0);
    expect(out.iterations).toBe(1);
  });

  it("passes selected model and credit settings to each LLM invocation", async () => {
    (invokeLLM as any).mockResolvedValueOnce({
      model: "gpt-4o-mini",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "Hello!" },
          finish_reason: "stop",
        },
      ],
      metering: {
        estimatedCredits: 1.5,
        chargedCredits: 1.5,
        balanceAfter: 10,
        success: true,
      },
    });

    const out = await runKaiAgent({
      messages: [{ role: "user", content: "hi" }],
      user: { id: 1, tenantId: "tenant-A" },
      model: "gpt-4o-mini",
      modelChain: ["gpt-4o-mini", "gemini-2.5-flash"],
      creditMultiplier: 1.5,
      minimumCredits: 1.5,
      awaitMetering: true,
    });

    expect(invokeLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        modelChain: ["gpt-4o-mini", "gemini-2.5-flash"],
        meter: expect.objectContaining({
          creditMultiplier: 1.5,
          minimumCredits: 1.5,
          awaitResult: true,
        }),
      })
    );
    expect(out.modelUsage[0]).toMatchObject({
      actualModel: "gpt-4o-mini",
      chargedCredits: 1.5,
      balanceAfter: 10,
    });
  });

  it("executes tool calls and feeds results back to LLM", async () => {
    (invokeLLM as any)
      .mockResolvedValueOnce({
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "",
              tool_calls: [
                {
                  id: "tc1",
                  type: "function",
                  function: {
                    name: "getRevenueByDay",
                    arguments: JSON.stringify({ days: 7 }),
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "Your revenue is $12,000" },
            finish_reason: "stop",
          },
        ],
      });
    (mcpCallTool as any).mockResolvedValueOnce({ revenue: 12000 });

    const out = await runKaiAgent({
      messages: [{ role: "user", content: "What's my revenue?" }],
      user: { id: 1, tenantId: "tenant-A" },
    });

    expect(out.toolCalls).toHaveLength(1);
    expect(out.toolCalls[0].name).toBe("getRevenueByDay");
    expect(out.finalContent).toBe("Your revenue is $12,000");
    expect(out.iterations).toBe(2);
  });

  it("CRITICAL: forces ctx.user.tenantId into tool args, ignoring LLM-provided value", async () => {
    (invokeLLM as any)
      .mockResolvedValueOnce({
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "",
              tool_calls: [
                {
                  id: "tc1",
                  type: "function",
                  function: {
                    name: "getRevenueByDay",
                    arguments: JSON.stringify({
                      tenantId: "tenant-EVIL",
                      days: 7,
                    }),
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "Done" },
            finish_reason: "stop",
          },
        ],
      });
    (mcpCallTool as any).mockResolvedValueOnce({ ok: true });

    await runKaiAgent({
      messages: [{ role: "user", content: "hi" }],
      user: { id: 1, tenantId: "tenant-A" },
    });

    expect(mcpCallTool).toHaveBeenCalledWith(
      "getRevenueByDay",
      expect.objectContaining({ tenantId: "tenant-A", days: 7 })
    );
    const calledArgs = (mcpCallTool as any).mock.calls[0][1];
    expect(calledArgs.tenantId).toBe("tenant-A");
    expect(calledArgs.tenantId).not.toBe("tenant-EVIL");
  });

  it("strips tenantId entirely if user has no tenant", async () => {
    (invokeLLM as any)
      .mockResolvedValueOnce({
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "",
              tool_calls: [
                {
                  id: "tc1",
                  type: "function",
                  function: {
                    name: "getLowStockProducts",
                    arguments: JSON.stringify({ tenantId: "tenant-EVIL" }),
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "Done" },
            finish_reason: "stop",
          },
        ],
      });
    (mcpCallTool as any).mockResolvedValueOnce({});

    await runKaiAgent({
      messages: [{ role: "user", content: "hi" }],
      user: { id: 1, tenantId: null },
    });

    const calledArgs = (mcpCallTool as any).mock.calls[0][1];
    expect(calledArgs.tenantId).toBeUndefined();
  });

  it("stress: handles concurrent tool-calling chats without tenant leakage", async () => {
    let responseCounter = 0;
    (invokeLLM as any).mockImplementation(
      async ({ messages }: { messages: Array<{ role: string }> }) => {
        responseCounter += 1;
        const hasToolResult = messages.some(message => message.role === "tool");
        if (hasToolResult) {
          return {
            id: `resp-final-${responseCounter}`,
            model: "gemini-2.5-flash",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "Stress final" },
                finish_reason: "stop",
              },
            ],
            metering: {
              estimatedCredits: 1,
              chargedCredits: 1,
              balanceAfter: 100,
              success: true,
            },
          };
        }

        return {
          id: `resp-tools-${responseCounter}`,
          model: "gemini-2.5-flash",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "",
                tool_calls: [
                  {
                    id: `tc-revenue-${responseCounter}`,
                    type: "function",
                    function: {
                      name: "getRevenueByDay",
                      arguments: JSON.stringify({
                        tenantId: "tenant-EVIL",
                        days: 30,
                      }),
                    },
                  },
                  {
                    id: `tc-stock-${responseCounter}`,
                    type: "function",
                    function: {
                      name: "getLowStockProducts",
                      arguments: "{not-json",
                    },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
        };
      }
    );
    (mcpCallTool as any).mockImplementation(
      async (name: string, args: Record<string, unknown>) => ({
        name,
        tenantId: args.tenantId,
        ok: true,
      })
    );

    const tenants = Array.from(
      { length: 25 },
      (_, index) => `tenant-stress-${index}`
    );
    const results = await Promise.all(
      tenants.map(tenantId =>
        runKaiAgent({
          messages: [{ role: "user", content: "stress my tools" }],
          user: { id: `user-${tenantId}`, tenantId },
          maxIterations: 3,
          awaitMetering: true,
        })
      )
    );

    expect(results).toHaveLength(tenants.length);
    for (const [index, result] of results.entries()) {
      expect(result.finalContent).toBe("Stress final");
      expect(result.iterations).toBe(2);
      expect(result.toolCalls).toHaveLength(2);
      expect(result.modelUsage).toHaveLength(2);
      for (const toolCall of result.toolCalls) {
        expect(toolCall.args).toEqual(
          expect.objectContaining({ tenantId: tenants[index] })
        );
        expect(JSON.stringify(toolCall.args)).not.toContain("tenant-EVIL");
      }
    }
    expect(invokeLLM).toHaveBeenCalledTimes(tenants.length * 2);
    expect(mcpCallTool).toHaveBeenCalledTimes(tenants.length * 2);
  });

  it("respects maxIterations to prevent infinite loop", async () => {
    (invokeLLM as any).mockResolvedValue({
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "tc1",
                type: "function",
                function: {
                  name: "getLowStockProducts",
                  arguments: "{}",
                },
              },
            ],
          },
          finish_reason: "tool_calls",
        },
      ],
    });
    (mcpCallTool as any).mockResolvedValue({});

    const out = await runKaiAgent({
      messages: [{ role: "user", content: "hi" }],
      user: { id: 1, tenantId: "tenant-A" },
      maxIterations: 2,
    });
    expect(out.iterations).toBeGreaterThanOrEqual(2);
    expect(out.finalContent).toContain("could not finalize");
  });
});
