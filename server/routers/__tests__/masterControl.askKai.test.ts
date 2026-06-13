import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/mcpClient", () => ({
  mcpCallTool: vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "Kai says hello" }],
  }),
}));

// auditMasterControl -> logAudit; stub it so the procedure doesn't touch the DB.
vi.mock("../../auditLogger", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import { masterControlRouter } from "../masterControl";
import { mcpCallTool } from "../../lib/mcpClient";
import { MASTER_CONTROL_ACCOUNT_ID } from "../../lib/masterControl";

const buildCtx = (openId: string, tenantId: number | null = 1) => ({
  user: {
    id: 1,
    email: "owner@example.com",
    openId,
    username: "master_control",
    role: "admin",
    tenantId,
  },
  req: { ip: "127.0.0.1", headers: {} },
  res: {} as any,
});

describe("masterControl.askKai (read-only Kai Q&A)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("proxies the question to ask_kai scoped to the selected tenant", async () => {
    const caller = masterControlRouter.createCaller(
      buildCtx(MASTER_CONTROL_ACCOUNT_ID) as any
    );
    const res = await caller.askKai({
      question: "Summarize risk",
      tenantId: 42,
    });

    expect(mcpCallTool).toHaveBeenCalledTimes(1);
    const [tool, args, options] = (mcpCallTool as any).mock.calls[0];
    expect(tool).toBe("ask_kai");
    expect(args).toEqual({ question: "Summarize risk" });
    expect(options).toEqual({ authoritativeTenantId: 42 });
    // Result is passed straight back for the client to render.
    expect(res.answer).toEqual({
      content: [{ type: "text", text: "Kai says hello" }],
    });
  });

  it("falls back to the owner's own tenant when none is selected", async () => {
    const caller = masterControlRouter.createCaller(
      buildCtx(MASTER_CONTROL_ACCOUNT_ID, 7) as any
    );
    await caller.askKai({ question: "Any failed payments?" });

    const [, , options] = (mcpCallTool as any).mock.calls[0];
    expect(options).toEqual({ authoritativeTenantId: 7 });
  });

  it("rejects non-owner accounts with FORBIDDEN and never calls the tool", async () => {
    const caller = masterControlRouter.createCaller(
      buildCtx("not-the-owner") as any
    );
    await expect(
      caller.askKai({ question: "show me everything" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mcpCallTool).not.toHaveBeenCalled();
  });

  it("rejects empty questions via input validation", async () => {
    const caller = masterControlRouter.createCaller(
      buildCtx(MASTER_CONTROL_ACCOUNT_ID) as any
    );
    await expect(caller.askKai({ question: "   " } as any)).rejects.toThrow();
    expect(mcpCallTool).not.toHaveBeenCalled();
  });
});
