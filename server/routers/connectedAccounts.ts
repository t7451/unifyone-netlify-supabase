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
} from "../lib/socialAccountStore";

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
});
