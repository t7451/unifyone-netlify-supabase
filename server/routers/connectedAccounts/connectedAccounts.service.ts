/**
 * server/routers/connectedAccounts/connectedAccounts.service.ts
 *
 * Use-case logic for managing a tenant's connected social accounts:
 * list (redacted), disconnect, and credential-based connect. Provider
 * credential exchange happens here; tokens are never returned to callers.
 *
 * Behavior is identical to the original connectedAccounts router.
 */
import { TRPCError } from "@trpc/server";
import { getProvider } from "../../lib/socialProviders";
import { registerBuiltinSocialProviders } from "../../lib/providers";
import { connectedAccountsRepo } from "./connectedAccounts.repo";

/** List the tenant's social accounts (redacted — no tokens). */
export async function list(tenantId: number) {
  return connectedAccountsRepo.listConnectedAccounts(tenantId);
}

/** Disconnect an account: wipe its stored tokens and mark disconnected. */
export async function disconnect(tenantId: number, accountId: number) {
  return connectedAccountsRepo.disconnectAccount(tenantId, accountId);
}

/**
 * Connect a Bluesky account via app password. Exchanges the credentials for
 * a session server-side and stores the (encrypted) tokens. Returns the
 * redacted account — never tokens.
 */
export async function connect(
  tenantId: number,
  input: {
    platform: "bluesky";
    identifier: string;
    appPassword: string;
    instanceUrl?: string;
  }
) {
  registerBuiltinSocialProviders();

  const provider = getProvider(input.platform);
  if (!provider?.connectWithCredentials) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Credential connect is not supported for ${input.platform}`,
    });
  }

  let tokens;
  try {
    tokens = await provider.connectWithCredentials({
      identifier: input.identifier,
      secret: input.appPassword,
      instanceUrl: input.instanceUrl,
    });
  } catch (e: unknown) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Could not connect to ${input.platform}: ${
        e instanceof Error ? e.message : String(e)
      }`,
    });
  }

  return connectedAccountsRepo.storeConnection(
    tenantId,
    input.platform,
    tokens
  );
}
