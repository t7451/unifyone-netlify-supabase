import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { shopifyStores } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const shopifyStoresRouter = router({
  // List all Shopify stores connected by the current user (or all stores for admin)
  listStores: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const stores = await db
      .select({
        id: shopifyStores.id,
        shopDomain: shopifyStores.shopDomain,
        shopName: shopifyStores.shopName,
        shopEmail: shopifyStores.shopEmail,
        shopCurrency: shopifyStores.shopCurrency,
        shopPlan: shopifyStores.shopPlan,
        scopes: shopifyStores.scopes,
        status: shopifyStores.status,
        lastSyncAt: shopifyStores.lastSyncAt,
        installedAt: shopifyStores.installedAt,
        tenantId: shopifyStores.tenantId,
      })
      .from(shopifyStores)
      .where(
        ctx.user.role === "admin"
          ? undefined
          : eq(shopifyStores.userId, ctx.user.id)
      )
      .orderBy(desc(shopifyStores.installedAt));
    return stores;
  }),

  // Get a single store by ID
  getStore: protectedProcedure
    .input(z.object({ storeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const stores = await db
        .select()
        .from(shopifyStores)
        .where(
          and(
            eq(shopifyStores.id, input.storeId),
            ctx.user.role === "admin"
              ? undefined
              : eq(shopifyStores.userId, ctx.user.id)
          )
        )
        .limit(1);
      if (!stores.length) throw new Error("Store not found");
      // Never return the access token to the client
      const { accessToken: _token, ...safe } = stores[0];
      return safe;
    }),

  // Remove a connected store
  removeStore: protectedProcedure
    .input(z.object({ storeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      // Verify ownership — select both userId and tenantId for cross-tenant isolation.
      const stores = await db
        .select({
          userId: shopifyStores.userId,
          tenantId: shopifyStores.tenantId,
        })
        .from(shopifyStores)
        .where(eq(shopifyStores.id, input.storeId))
        .limit(1);
      if (!stores.length) throw new Error("Store not found");
      const store = stores[0];
      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin) {
        if (store.userId !== ctx.user.id) throw new Error("Forbidden");
        // Enforce tenant isolation: store must belong to the caller's tenant
        if (
          store.tenantId !== null &&
          ctx.user.tenantId !== null &&
          store.tenantId !== ctx.user.tenantId
        ) {
          throw new Error("Forbidden");
        }
      }
      // Atomic update: include tenantId (or userId) in WHERE to prevent TOCTOU cross-tenant writes
      await db
        .update(shopifyStores)
        .set({ status: "uninstalled" })
        .where(
          isAdmin
            ? eq(shopifyStores.id, input.storeId)
            : and(
                eq(shopifyStores.id, input.storeId),
                eq(shopifyStores.userId, ctx.user.id)
              )
        );
      return { success: true };
    }),

  // Trigger a manual sync for a store (records intent, actual sync via n8n/webhook)
  syncNow: protectedProcedure
    .input(z.object({ storeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const stores = await db
        .select({
          userId: shopifyStores.userId,
          tenantId: shopifyStores.tenantId,
          shopDomain: shopifyStores.shopDomain,
        })
        .from(shopifyStores)
        .where(eq(shopifyStores.id, input.storeId))
        .limit(1);
      if (!stores.length) throw new Error("Store not found");
      const store = stores[0];
      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin) {
        if (store.userId !== ctx.user.id) throw new Error("Forbidden");
        if (
          store.tenantId !== null &&
          ctx.user.tenantId !== null &&
          store.tenantId !== ctx.user.tenantId
        ) {
          throw new Error("Forbidden");
        }
      }
      // Atomic update: include userId in WHERE to prevent TOCTOU cross-tenant writes
      await db
        .update(shopifyStores)
        .set({ lastSyncAt: new Date() })
        .where(
          isAdmin
            ? eq(shopifyStores.id, input.storeId)
            : and(
                eq(shopifyStores.id, input.storeId),
                eq(shopifyStores.userId, ctx.user.id)
              )
        );
      return { success: true, syncedAt: new Date().toISOString() };
    }),

  // Get granted scopes for a store
  getScopes: protectedProcedure
    .input(z.object({ storeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const stores = await db
        .select({
          scopes: shopifyStores.scopes,
          userId: shopifyStores.userId,
          tenantId: shopifyStores.tenantId,
        })
        .from(shopifyStores)
        .where(eq(shopifyStores.id, input.storeId))
        .limit(1);
      if (!stores.length) throw new Error("Store not found");
      const store = stores[0];
      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin) {
        if (store.userId !== ctx.user.id) throw new Error("Forbidden");
        if (
          store.tenantId !== null &&
          ctx.user.tenantId !== null &&
          store.tenantId !== ctx.user.tenantId
        ) {
          throw new Error("Forbidden");
        }
      }
      const scopes = store.scopes.split(",").map(s => s.trim());
      return { scopes };
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
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db
        .update(shopifyStores)
        .set({ userId: input.userId, tenantId: input.tenantId })
        .where(eq(shopifyStores.id, input.storeId));
      return { success: true };
    }),
});
