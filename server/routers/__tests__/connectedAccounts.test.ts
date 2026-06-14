import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/socialAccountStore", () => ({
  listConnectedAccounts: vi.fn().mockResolvedValue([
    {
      id: 1,
      tenantId: 7,
      platform: "linkedin",
      handle: "@acme",
      isConnected: true,
    },
  ]),
  disconnectAccount: vi.fn().mockResolvedValue({ success: true }),
  storeConnection: vi.fn().mockResolvedValue({
    id: 2,
    tenantId: 7,
    platform: "bluesky",
    handle: "alice.bsky.social",
    isConnected: true,
  }),
}));

vi.mock("../../lib/providers", () => ({
  registerBuiltinSocialProviders: vi.fn(),
}));

const connectWithCredentials = vi.fn().mockResolvedValue({
  accessToken: "ACCESS",
  refreshToken: "REFRESH",
  handle: "alice.bsky.social",
  platformUserId: "did:plc:abc",
});
vi.mock("../../lib/socialProviders", () => ({
  getProvider: vi.fn(() => ({ platform: "bluesky", connectWithCredentials })),
}));

import { connectedAccountsRouter } from "../connectedAccounts";
import {
  listConnectedAccounts,
  disconnectAccount,
  storeConnection,
} from "../../lib/socialAccountStore";
import { getProvider } from "../../lib/socialProviders";

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

  it("connects bluesky: exchanges creds then stores (redacted result)", async () => {
    const caller = connectedAccountsRouter.createCaller(
      buildCtx("admin") as any
    );
    const res = await caller.connect({
      platform: "bluesky",
      identifier: "alice.bsky.social",
      appPassword: "app-pass-1234",
    });

    expect(connectWithCredentials).toHaveBeenCalledWith({
      identifier: "alice.bsky.social",
      secret: "app-pass-1234",
      instanceUrl: undefined,
    });
    expect(storeConnection).toHaveBeenCalledWith(7, "bluesky", {
      accessToken: "ACCESS",
      refreshToken: "REFRESH",
      handle: "alice.bsky.social",
      platformUserId: "did:plc:abc",
    });
    expect(res).not.toHaveProperty("accessToken");
    expect(res).toMatchObject({ platform: "bluesky" });
  });

  it("maps a provider connect failure to BAD_REQUEST and does not store", async () => {
    connectWithCredentials.mockRejectedValueOnce(new Error("bad creds"));
    const caller = connectedAccountsRouter.createCaller(
      buildCtx("admin") as any
    );
    await expect(
      caller.connect({
        platform: "bluesky",
        identifier: "x",
        appPassword: "y",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(storeConnection).not.toHaveBeenCalled();
  });

  it("rejects connect from non-admin callers", async () => {
    const caller = connectedAccountsRouter.createCaller(
      buildCtx("user") as any
    );
    await expect(
      caller.connect({
        platform: "bluesky",
        identifier: "x",
        appPassword: "y",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getProvider).not.toHaveBeenCalled();
  });
});
