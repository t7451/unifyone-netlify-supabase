/**
 * server/routers/connectedAccounts.ts
 *
 * tRPC router for managing a tenant's connected social accounts.
 * Admin-gated (connect/disconnect are sensitive). Tokens are never returned —
 * `list` yields redacted accounts only.
 *
 * The connect flow (start/callback) is added in the connect-flow PR; this
 * router currently exposes read + disconnect over the encrypted vault.
 */
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  disconnectAccount,
  listConnectedAccounts,
  storeConnection,
} from "../lib/socialAccountStore";
import { getProvider } from "../lib/socialProviders";
import { registerBuiltinSocialProviders } from "../lib/providers";

function requireTenant(tenantId: number | null | undefined): number {
  if (!tenantId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No active tenant" });
  }
  return tenantId;
}

export const connectedAccountsRouter = router({
  /** List the tenant's social accounts (redacted — no tokens). */
  list: adminProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return listConnectedAccounts(tenantId);
  }),

  /** Disconnect an account: wipe its stored tokens and mark disconnected. */
  disconnect: adminProcedure
    .input(z.object({ accountId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return disconnectAccount(tenantId, input.accountId);
    }),

  /**
   * Connect a Bluesky account via app password. Exchanges the credentials for
   * a session server-side and stores the (encrypted) tokens. Returns the
   * redacted account — never tokens.
   */
  connect: adminProcedure
    .input(
      z.object({
        platform: z.enum(["bluesky"]),
        identifier: z.string().trim().min(1).max(255),
        appPassword: z.string().min(1).max(255),
        instanceUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
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

      return storeConnection(tenantId, input.platform, tokens);
    }),
});
