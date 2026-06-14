import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/socialAccountStore", () => ({
  listConnectedAccounts: vi
    .fn()
    .mockResolvedValue([
      {
        id: 1,
        tenantId: 7,
        platform: "linkedin",
        handle: "@acme",
        isConnected: true,
      },
    ]),
  disconnectAccount: vi.fn().mockResolvedValue({ success: true }),
}));

import { connectedAccountsRouter } from "../connectedAccounts";
import {
  listConnectedAccounts,
  disconnectAccount,
} from "../../lib/socialAccountStore";

const buildCtx = (role: string, tenantId: number | null = 7) => ({
  user: { id: 1, email: "u@example.com", openId: "x", role, tenantId },
  req: { ip: "127.0.0.1", headers: {} },
  res: {} as any,
});

describe("connectedAccounts router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists redacted accounts scoped to the tenant (admin)", async () => {
    const caller = connectedAccountsRouter.createCaller(
      buildCtx("admin") as any
    );
    const res = await caller.list();
    expect(listConnectedAccounts).toHaveBeenCalledWith(7);
    expect(res[0]).not.toHaveProperty("accessToken");
    expect(res[0]).not.toHaveProperty("refreshToken");
  });

  it("disconnects an account scoped to the tenant (admin)", async () => {
    const caller = connectedAccountsRouter.createCaller(
      buildCtx("admin") as any
    );
    const res = await caller.disconnect({ accountId: 5 });
    expect(disconnectAccount).toHaveBeenCalledWith(7, 5);
    expect(res).toEqual({ success: true });
  });

  it("rejects non-admin callers", async () => {
    const caller = connectedAccountsRouter.createCaller(
      buildCtx("user") as any
    );
    await expect(caller.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.disconnect({ accountId: 5 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(listConnectedAccounts).not.toHaveBeenCalled();
    expect(disconnectAccount).not.toHaveBeenCalled();
  });

  it("rejects admin with no active tenant", async () => {
    const caller = connectedAccountsRouter.createCaller(
      buildCtx("admin", null) as any
    );
    await expect(caller.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(listConnectedAccounts).not.toHaveBeenCalled();
  });
});
