import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/mcpClient", () => ({
  mcpCallTool: vi.fn().mockResolvedValue({ ok: true }),
}));

import { shopifyThemeRouter } from "../shopifyTheme";
import { mcpCallTool } from "../../lib/mcpClient";

const buildCtx = (tenantId: number | null) => ({
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

describe("shopifyThemeRouter tenant scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getSections forwards the authenticated tenant to the MCP worker", async () => {
    const caller = shopifyThemeRouter.createCaller(buildCtx(7) as any);
    await caller.getSections();
    expect(mcpCallTool).toHaveBeenCalledWith(
      "get_theme_sections",
      {},
      { authoritativeTenantId: 7 }
    );
  });

  it("getPerformance forwards the authenticated tenant to the MCP worker", async () => {
    const caller = shopifyThemeRouter.createCaller(buildCtx(7) as any);
    await caller.getPerformance();
    expect(mcpCallTool).toHaveBeenCalledWith(
      "get_theme_performance",
      {},
      { authoritativeTenantId: 7 }
    );
  });

  it("getLoyaltyConfig forwards the authenticated tenant to the MCP worker", async () => {
    const caller = shopifyThemeRouter.createCaller(buildCtx(7) as any);
    await caller.getLoyaltyConfig();
    expect(mcpCallTool).toHaveBeenCalledWith(
      "get_loyalty_config",
      {},
      { authoritativeTenantId: 7 }
    );
  });

  it("updateSection ignores a spoofed tenantId and uses ctx.user.tenantId", async () => {
    const caller = shopifyThemeRouter.createCaller(buildCtx(7) as any);
    await caller.updateSection({
      // A malicious client may try to smuggle another tenant id — the zod
      // schema strips it and the router never reads it.
      tenantId: 999,
      section: "hero",
      settings: { headline: "hi" },
    } as any);

    expect(mcpCallTool).toHaveBeenCalledTimes(1);
    const [tool, args, options] = (mcpCallTool as any).mock.calls[0];
    expect(tool).toBe("update_section_settings");
    expect(args).toEqual({ section: "hero", settings: { headline: "hi" } });
    expect(args.tenant_id).toBeUndefined();
    expect(args.tenantId).toBeUndefined();
    expect(options).toEqual({ authoritativeTenantId: 7 });
  });

  it("syncConfig ignores a spoofed tenantId and uses ctx.user.tenantId", async () => {
    const caller = shopifyThemeRouter.createCaller(buildCtx(7) as any);
    await caller.syncConfig({
      tenantId: 999,
      section: "all",
      settings: {},
    } as any);

    const [tool, args, options] = (mcpCallTool as any).mock.calls[0];
    expect(tool).toBe("sync_theme_config");
    expect(args.tenant_id).toBeUndefined();
    expect(args.tenantId).toBeUndefined();
    expect(options).toEqual({ authoritativeTenantId: 7 });
  });

  it("throws FORBIDDEN when the caller has no active tenant", async () => {
    const caller = shopifyThemeRouter.createCaller(buildCtx(null) as any);
    await expect(caller.getSections()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(mcpCallTool).not.toHaveBeenCalled();
  });
});
