import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

const repo = vi.hoisted(() => ({
  database: vi.fn(),
  listConnections: vi.fn(),
  ownedConnection: vi.fn(),
  createConnection: vi.fn(),
  completeArgyle: vi.fn(),
  deleteConnection: vi.fn(),
  acquireLease: vi.fn(),
  releaseLease: vi.fn(),
  commitSync: vi.fn(),
}));
const provider = vi.hoisted(() => ({
  providerReady: vi.fn(),
  providerCredentialsReady: vi.fn(),
  providerEnvironment: vi.fn(),
  plaidLinkToken: vi.fn(),
  exchangePlaidToken: vi.fn(),
  createArgyleUser: vi.fn(),
  argyleUserToken: vi.fn(),
  revokeProvider: vi.fn(),
  syncPlaid: vi.fn(),
  syncArgyle: vi.fn(),
}));
vi.mock("./repo", () => repo);
vi.mock("./providers", async original => ({
  ...(await original<typeof import("./providers")>()),
  ...provider,
}));
import * as service from "./service";
import { sealToken } from "./crypto";

const connection = () => ({
  id: "connection",
  userId: 7,
  provider: "plaid",
  environment: "sandbox",
  externalId: "item",
  encryptedToken: sealToken("private-token", "7:plaid:sandbox:item"),
  cursor: "saved",
  accounts: [],
  status: "ready",
  lastSyncedAt: new Date(),
  consentAt: new Date(),
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("FINANCIAL_TOKEN_ENC_KEY", "a".repeat(64));
  provider.providerReady.mockReturnValue(true);
  provider.providerCredentialsReady.mockReturnValue(true);
  provider.providerEnvironment.mockReturnValue("sandbox");
  repo.database.mockResolvedValue({});
  repo.releaseLease.mockResolvedValue(undefined);
  repo.commitSync.mockResolvedValue({ imported: 1, accounts: 1 });
  provider.revokeProvider.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("personal financial connection lifecycle", () => {
  it("never returns stored tokens, cursors or external provider user/item IDs in the connection list", async () => {
    repo.listConnections.mockResolvedValue([connection()]);
    const listed = await service.list(7);
    expect(repo.listConnections).toHaveBeenCalledWith(7);
    expect(listed[0]).not.toHaveProperty("encryptedToken");
    expect(listed[0]).not.toHaveProperty("cursor");
    expect(listed[0]).not.toHaveProperty("externalId");
  });
  it("stops at ownership verification before calling a provider for another user's connection", async () => {
    repo.acquireLease.mockRejectedValue(new TRPCError({ code: "NOT_FOUND" }));
    await expect(service.sync(99, "connection")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(repo.acquireLease).toHaveBeenCalledWith(99, "connection");
    expect(provider.syncPlaid).not.toHaveBeenCalled();
  });
  it("commits data only after the whole provider fetch succeeds", async () => {
    repo.acquireLease.mockResolvedValue({
      connection: connection(),
      lease: "lease",
    });
    provider.syncPlaid.mockResolvedValue({ records: ["complete-result"] });
    await service.sync(7, "connection");
    expect(provider.syncPlaid).toHaveBeenCalledWith(
      "private-token",
      "sandbox",
      "saved"
    );
    expect(repo.commitSync).toHaveBeenCalledWith(7, "connection", "lease", {
      records: ["complete-result"],
    });
  });
  it("does not commit a partial failed import or advance its cursor", async () => {
    repo.acquireLease.mockResolvedValue({
      connection: connection(),
      lease: "lease",
    });
    provider.syncPlaid.mockRejectedValue(new Error("provider failed"));
    await expect(service.sync(7, "connection")).rejects.toThrow();
    expect(repo.commitSync).not.toHaveBeenCalled();
    expect(repo.releaseLease).toHaveBeenCalledWith(
      7,
      "connection",
      "lease",
      "sync_error"
    );
  });
  it("revokes provider access before deleting local activity", async () => {
    repo.acquireLease.mockResolvedValue({
      connection: connection(),
      lease: "lease",
    });
    await service.disconnect(7, "connection");
    expect(provider.revokeProvider).toHaveBeenCalledWith(
      "plaid",
      "sandbox",
      "item",
      "private-token"
    );
    expect(provider.revokeProvider.mock.invocationCallOrder[0]).toBeLessThan(
      repo.deleteConnection.mock.invocationCallOrder[0]
    );
  });
  it("retains the local connection for retry if revocation fails", async () => {
    repo.acquireLease.mockResolvedValue({
      connection: connection(),
      lease: "lease",
    });
    provider.revokeProvider.mockRejectedValue(
      new Error("provider unavailable")
    );
    await expect(service.disconnect(7, "connection")).rejects.toThrow();
    expect(repo.deleteConnection).not.toHaveBeenCalled();
    expect(repo.releaseLease).toHaveBeenCalledWith(
      7,
      "connection",
      "lease",
      "disconnect_failed"
    );
  });
  it("uses the Argyle user mapping read under the lease instead of stale pre-lease data", async () => {
    vi.stubEnv("ARGYLE_READ_ONLY_FLOW_ID", "read-only-flow");
    repo.listConnections.mockResolvedValue([
      { ...connection(), provider: "argyle", externalId: null },
    ]);
    repo.acquireLease.mockResolvedValue({
      connection: {
        ...connection(),
        provider: "argyle",
        externalId: "already-created",
      },
      lease: "lease",
    });
    provider.argyleUserToken.mockResolvedValue("short-lived-token");
    const result = await service.beginGig(7);
    expect(provider.createArgyleUser).not.toHaveBeenCalled();
    expect(provider.argyleUserToken).toHaveBeenCalledWith(
      "already-created",
      "sandbox"
    );
    expect(result.flowId).toBe("read-only-flow");
  });
  it("refuses to connect or sync if encryption or provider configuration is missing", async () => {
    vi.stubEnv("FINANCIAL_TOKEN_ENC_KEY", "");
    await expect(service.beginBank(7)).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    expect(provider.plaidLinkToken).not.toHaveBeenCalled();
  });
});

import { financialConnectionsRouter } from "./index";
describe("financial transport authorization", () => {
  it("rejects unauthenticated linking before any provider calls", async () => {
    const caller = financialConnectionsRouter.createCaller({
      user: null,
    } as never);
    await expect(
      caller.beginBankLink({ readOnlyConsent: true })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(provider.plaidLinkToken).not.toHaveBeenCalled();
  });
  it("requires explicit read-only consent", async () => {
    const caller = financialConnectionsRouter.createCaller({
      user: { id: 7 },
    } as never);
    await expect(
      caller.beginBankLink({ readOnlyConsent: false } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(provider.plaidLinkToken).not.toHaveBeenCalled();
  });
  it("gets connection ownership from the session, ignoring a caller-supplied user ID", async () => {
    const caller = financialConnectionsRouter.createCaller({
      user: { id: 7 },
    } as never);
    repo.acquireLease.mockRejectedValue(new TRPCError({ code: "NOT_FOUND" }));
    const id = "f0b3490b-448c-4130-8f61-1fe994c2fdbb";
    await expect(
      caller.refresh({ connectionId: id, userId: 99 } as never)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(repo.acquireLease).toHaveBeenCalledWith(7, id);
  });
  it("does not leak raw database errors through the API", async () => {
    const caller = financialConnectionsRouter.createCaller({
      user: { id: 7 },
    } as never);
    repo.listConnections.mockRejectedValue(
      new Error("postgresql://sensitive-value")
    );
    await expect(caller.list()).rejects.toMatchObject({
      message:
        "Connected money could not complete this request. Please try again.",
    });
  });
});

it("can revoke an existing Argyle connection after its Link flow or encryption key is removed", async () => {
  const c = { ...connection(), provider: "argyle", externalId: "gig-user" };
  repo.acquireLease.mockResolvedValue({ connection: c, lease: "lease" });
  vi.stubEnv("FINANCIAL_TOKEN_ENC_KEY", "");
  vi.stubEnv("ARGYLE_READ_ONLY_FLOW_ID", "");
  await service.disconnect(7, "connection");
  expect(provider.revokeProvider).toHaveBeenCalledWith(
    "argyle",
    "sandbox",
    "gig-user",
    undefined
  );
  expect(repo.deleteConnection).toHaveBeenCalledWith(7, "connection");
});
