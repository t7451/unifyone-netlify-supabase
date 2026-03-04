import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTenant, getAllTenants, getPlans, getTenantById, getTenantsByOwner, updateTenant, updateUserTenant } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const tenantRouter = router({
  // Get all tenants owned by the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return getTenantsByOwner(ctx.user.id);
  }),

  // Admin: get all tenants
  listAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getAllTenants();
  }),

  // Get a single tenant
  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const tenant = await getTenantById(input.id);
    if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });
    if (tenant.ownerId !== ctx.user.id && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return tenant;
  }),

  // Create a new tenant (store/workspace)
  create: protectedProcedure.input(z.object({
    name: z.string().min(2).max(255),
    slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  })).mutation(async ({ ctx, input }) => {
    await createTenant({ name: input.name, slug: input.slug, ownerId: ctx.user.id });
    const tenants = await getTenantsByOwner(ctx.user.id);
    const newTenant = tenants.find(t => t.slug === input.slug);
    if (newTenant) await updateUserTenant(ctx.user.id, newTenant.id);
    return newTenant;
  }),

  // Update tenant settings
  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().min(2).max(255).optional(),
    domain: z.string().optional(),
    logoUrl: z.string().optional(),
    shopifyShopDomain: z.string().optional(),
    shopifyAccessToken: z.string().optional(),
    shopifySyncEnabled: z.boolean().optional(),
    n8nWebhookUrl: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const tenant = await getTenantById(input.id);
    if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });
    if (tenant.ownerId !== ctx.user.id && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const { id, ...data } = input;
    await updateTenant(id, data);
    return getTenantById(id);
  }),

  // Get subscription plans
  getPlans: protectedProcedure.query(async () => {
    return getPlans();
  }),
});
