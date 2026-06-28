import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../../_core/trpc";
import * as service from "./shopifyStores.service";

/**
 * Transport layer for the Shopify stores router. Procedure definitions, zod
 * input schemas and auth middleware live here; ownership/tenant-isolation
 * use-cases live in shopifyStores.service.ts and data access in
 * shopifyStores.repo.ts. The exported router name/shape is unchanged.
 */
export const shopifyStoresRouter = router({
  // List all Shopify stores connected by the current user's tenant
  listStores: protectedProcedure.query(async ({ ctx }) => {
    return service.listStores(ctx.user);
  }),

  // Get a single store by ID
  getStore: protectedProcedure
    .input(z.object({ storeId: z.number() }))
    .query(async ({ ctx, input }) => {
      return service.getStore(ctx.user, input.storeId);
    }),

  // Remove a connected store
  removeStore: protectedProcedure
    .input(z.object({ storeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return service.removeStore(ctx.user, input.storeId);
    }),

  // Trigger a manual sync for a store (records intent, actual sync via n8n/webhook)
  syncNow: protectedProcedure
    .input(z.object({ storeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return service.syncNow(ctx.user, input.storeId);
    }),

  // Get granted scopes for a store
  getScopes: protectedProcedure
    .input(z.object({ storeId: z.number() }))
    .query(async ({ ctx, input }) => {
      return service.getScopes(ctx.user, input.storeId);
    }),

  // Admin: link a store to a specific user
  linkToUser: adminProcedure
    .input(
      z.object({
        storeId: z.number(),
        userId: z.number(),
        tenantId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return service.linkToUser(input);
    }),
});
