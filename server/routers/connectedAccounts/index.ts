/**
 * server/routers/connectedAccounts/index.ts
 *
 * Transport layer for managing a tenant's connected social accounts.
 * Admin-gated (connect/disconnect are sensitive). Tokens are never returned —
 * `list` yields redacted accounts only.
 *
 * Use-case logic lives in `connectedAccounts.service.ts`; data access in
 * `connectedAccounts.repo.ts`.
 */
import { z } from "zod";
import { adminProcedure, router } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as service from "./connectedAccounts.service";

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
    return service.list(tenantId);
  }),

  /** Disconnect an account: wipe its stored tokens and mark disconnected. */
  disconnect: adminProcedure
    .input(z.object({ accountId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return service.disconnect(tenantId, input.accountId);
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
      return service.connect(tenantId, input);
    }),
});
