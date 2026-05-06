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
