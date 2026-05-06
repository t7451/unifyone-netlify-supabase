import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/mcpClient", () => ({
  mcpHealth: vi.fn(),
  mcpListTools: vi.fn().mockResolvedValue([]),
  mcpInitialize: vi.fn(),
  mcpCallTool: vi.fn().mockResolvedValue({ ok: true }),
  MCP_WORKER_URL: "https://test.example.com",
}));

vi.mock("../../creditMeter", () => ({
  meterCredits: vi.fn().mockResolvedValue({
    success: true,
    balanceAfter: 100,
    overageCredits: 0,
    eventId: "evt1",
  }),
}));

import { mcpRouter } from "../mcp";
import { mcpCallTool } from "../../lib/mcpClient";

const buildCtx = (tenantId: string | null) => ({
  user: {
    id: 1,
    email: "u@example.com",
    tenantId,
    role: "user",
    openId: "x",
  },
  req: {} as any,
  res: {} as any,
});

describe("mcpRouter tenant scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("callTool overrides client-provided tenantId with ctx.user.tenantId", async () => {
    const caller = mcpRouter.createCaller(buildCtx("tenant-A") as any);
    await caller.callTool({
      tool: "listProducts",
      args: { tenantId: "tenant-B-EVIL", limit: 10 },
    });
    expect(mcpCallTool).toHaveBeenCalledWith(
      "listProducts",
      expect.objectContaining({ tenantId: "tenant-A", limit: 10 })
    );
    const callArgs = (mcpCallTool as any).mock.calls[0][1];
    expect(callArgs.tenantId).toBe("tenant-A");
    expect(callArgs.tenantId).not.toBe("tenant-B-EVIL");
  });

  it("callTool strips tenantId entirely if user has no tenant", async () => {
    const caller = mcpRouter.createCaller(buildCtx(null) as any);
    await caller.callTool({
      tool: "listProducts",
      args: { tenantId: "tenant-EVIL" },
    });
    const callArgs = (mcpCallTool as any).mock.calls[0][1];
    expect(callArgs.tenantId).toBeUndefined();
  });

  it("analytics always uses ctx.user.tenantId, ignores client input", async () => {
    const caller = mcpRouter.createCaller(buildCtx("tenant-A") as any);
    await caller.analytics();
    expect(mcpCallTool).toHaveBeenCalledWith("getAnalyticsSummary", {
      tenantId: "tenant-A",
    });
  });

  it("lowStock injects ctx.user.tenantId", async () => {
    const caller = mcpRouter.createCaller(buildCtx("tenant-A") as any);
    await caller.lowStock({ threshold: 5 });
    expect(mcpCallTool).toHaveBeenCalledWith(
      "getLowStockProducts",
      expect.objectContaining({ threshold: 5, tenantId: "tenant-A" })
    );
  });
});
