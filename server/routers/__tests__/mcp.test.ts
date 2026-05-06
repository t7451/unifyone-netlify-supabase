import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/mcpClient", () => ({
  mcpHealth: vi.fn(),
  mcpListTools: vi.fn().mockResolvedValue([]),
  mcpInitialize: vi.fn(),
  mcpCallTool: vi.fn().mockResolvedValue({ ok: true }),
  MCP_WORKER_URL: "https://test.example.com",
  normalizeMcpToolName: vi.fn((toolName: string) =>
    toolName
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/[\s-]+/g, "_")
      .toLowerCase()
  ),
  normalizeMcpToolArguments: vi.fn(
    (
      args: Record<string, unknown> = {},
      options: { authoritativeTenantId?: string | number | null } = {}
    ) => {
      const normalized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(args)) {
        if (value === undefined || key === "tenantId" || key === "tenant_id") {
          continue;
        }
        const normalizedKey = key
          .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
          .toLowerCase();
        normalized[normalizedKey] = value;
      }
      if (
        options.authoritativeTenantId !== null &&
        options.authoritativeTenantId !== undefined
      ) {
        normalized.tenant_id = options.authoritativeTenantId;
      }
      return normalized;
    }
  ),
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
import { mcpCallTool, mcpListTools } from "../../lib/mcpClient";

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

  it("callTool maps camelCase tools and uses ctx.user.tenantId as tenant_id", async () => {
    const caller = mcpRouter.createCaller(buildCtx("tenant-A") as any);
    await caller.callTool({
      tool: "listProducts",
      args: {
        tenantId: "tenant-B-EVIL",
        tenant_id: "tenant-C-EVIL",
        productId: 123,
        limit: 10,
      },
    });
    expect(mcpCallTool).toHaveBeenCalledWith(
      "list_products",
      expect.objectContaining({
        tenant_id: "tenant-A",
        product_id: 123,
        limit: 10,
      })
    );
    const callArgs = (mcpCallTool as any).mock.calls[0][1];
    expect(callArgs.tenant_id).toBe("tenant-A");
    expect(callArgs.tenantId).toBeUndefined();
    expect(callArgs.tenant_id).not.toBe("tenant-B-EVIL");
    expect(callArgs.tenant_id).not.toBe("tenant-C-EVIL");
  });

  it("callTool accepts snake_case tools and strips tenant args if user has no tenant", async () => {
    const caller = mcpRouter.createCaller(buildCtx(null) as any);
    await caller.callTool({
      tool: "list_products",
      args: { tenantId: "tenant-EVIL", tenant_id: "tenant-EVIL-2" },
    });
    expect(mcpCallTool).toHaveBeenCalledWith("list_products", {});
    const callArgs = (mcpCallTool as any).mock.calls[0][1];
    expect(callArgs.tenantId).toBeUndefined();
    expect(callArgs.tenant_id).toBeUndefined();
  });

  it("analytics always uses ctx.user.tenantId, ignores client input", async () => {
    const caller = mcpRouter.createCaller(buildCtx("tenant-A") as any);
    await caller.analytics();
    expect(mcpCallTool).toHaveBeenCalledWith("get_analytics_summary", {
      tenant_id: "tenant-A",
    });
  });

  it("lowStock injects ctx.user.tenantId", async () => {
    const caller = mcpRouter.createCaller(buildCtx("tenant-A") as any);
    await caller.lowStock({ threshold: 5 });
    expect(mcpCallTool).toHaveBeenCalledWith(
      "get_low_stock_products",
      expect.objectContaining({ threshold: 5, tenant_id: "tenant-A" })
    );
  });
});

describe("mcpRouter config", () => {
  beforeEach(() => vi.clearAllMocks());

  it("surfaces an expanded snake_case tool catalog without hard-coded limits", async () => {
    const liveCatalog = [
      "list_stores",
      "get_tenant_info",
      "list_products",
      "get_analytics_summary",
      "ask_kai",
      "list_deals",
      "query_graph",
      "list_pixel_assets",
      ...Array.from({ length: 43 }, (_, index) => `custom_tool_${index + 1}`),
    ].map(name => ({ name, description: `${name} description` }));
    vi.mocked(mcpListTools).mockResolvedValueOnce(liveCatalog);

    const caller = mcpRouter.createCaller(buildCtx("tenant-A") as any);
    const config = await caller.config();

    expect(config.toolCount).toBe(51);
    expect(config.tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "list_products" }),
        expect.objectContaining({ name: "get_analytics_summary" }),
        expect.objectContaining({ name: "query_graph" }),
      ])
    );
    expect(config.tools).not.toContainEqual(
      expect.objectContaining({ name: "listProducts" })
    );
  });
});
