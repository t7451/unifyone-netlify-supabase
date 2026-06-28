/**
 * server/routers/developer/index.ts
 *
 * Developer Hub tRPC router (transport layer) — API keys, webhook logs,
 * platform health, and code snippet helpers for platform builders and
 * integrators.
 *
 * All procedures require authentication (protectedProcedure).
 * Tenant-scoped data is always filtered by ctx.user.tenantId.
 *
 * Use-case logic (incl. API key secret generation) lives in
 * `developer.service.ts`; data access in `developer.repo.ts`.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import * as service from "./developer.service";

function requireTenantId(tenantId: number | null | undefined): number {
  if (!tenantId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active tenant. Complete store setup first.",
    });
  }
  return tenantId;
}

export const developerRouter = router({
  // ── API Keys ────────────────────────────────────────────────────────────────

  /** List all active API keys for the current tenant (never returns raw key). */
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenantId(ctx.user.tenantId);
    return service.listApiKeys(tenantId);
  }),

  /** Generate a new API key. Raw key is returned ONCE — store it safely. */
  generateApiKey: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        scopes: z.array(z.string()).default(["read"]),
        expiresInDays: z.number().min(1).max(365).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx.user.tenantId);
      return service.generateApiKey(tenantId, ctx.user.id, input);
    }),

  /** Revoke an API key by ID. */
  revokeApiKey: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx.user.tenantId);
      return service.revokeApiKey(tenantId, input.id);
    }),

  // ── Webhook Logs ────────────────────────────────────────────────────────────

  /** Retrieve recent webhook events for the current tenant, with optional filters. */
  webhookLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        source: z.enum(["stripe", "shopify", "n8n", "internal"]).optional(),
        status: z
          .enum(["pending", "processed", "failed", "skipped"])
          .optional(),
        search: z.string().max(100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx.user.tenantId);
      return service.webhookLogs(tenantId, input);
    }),

  /** Aggregated webhook event counts by status for the current tenant. */
  webhookStats: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenantId(ctx.user.tenantId);
    return service.webhookStats(tenantId);
  }),

  /** Mark a failed webhook event as pending so it is retried on next processing run. */
  retryWebhook: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx.user.tenantId);
      return service.retryWebhook(tenantId, input.id);
    }),

  // ── Platform Health ─────────────────────────────────────────────────────────

  /** Quick health check of all platform services from the server side. */
  health: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenantId(ctx.user.tenantId);
    return service.health(tenantId);
  }),

  // ── Endpoint Reference ──────────────────────────────────────────────────────

  /**
   * Return a curated list of tRPC router namespaces and their key procedures
   * for use in the developer hub API explorer.
   */
  endpointReference: protectedProcedure.query(async () => {
    return service.endpointReference();
  }),

  // ── Code Snippets ────────────────────────────────────────────────────────────

  /** Return ready-to-use code snippets for common storefront integrations. */
  codeSnippets: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenantId(ctx.user.tenantId);
    return service.codeSnippets(tenantId);
  }),
});
