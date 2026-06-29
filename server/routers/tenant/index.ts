import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { setEdgeCache, EDGE_CACHE } from "../../_core/cacheControl";
import * as tenantService from "./tenant.service";

const googleOAuthInputSchema = z.object({
  enabled: z.boolean(),
  clientId: z.string().trim().max(255),
  clientSecret: z.string().trim().max(255).optional(),
  redirectUri: z.string().trim().url().or(z.literal("")),
  scopes: z.string().trim().max(500),
});

export const tenantRouter = router({
  // Get all tenants owned by the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return tenantService.list(ctx.user);
  }),

  // Admin: get all tenants
  listAll: protectedProcedure.query(async ({ ctx }) => {
    return tenantService.listAll(ctx.user);
  }),

  // Get a single tenant
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return tenantService.get(ctx.user, input);
    }),

  // Check if a slug is available (called while logged in during store setup)
  checkSlugAvailable: protectedProcedure
    .input(
      z.object({
        slug: z
          .string()
          .min(2)
          .max(100)
          .regex(/^[a-z0-9-]+$/),
      })
    )
    .query(async ({ input }) => {
      return tenantService.checkSlugAvailable(input);
    }),

  // Create a new tenant (store/workspace)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(255),
        slug: z
          .string()
          .min(2)
          .max(100)
          .regex(/^[a-z0-9-]+$/),
        primaryProduct: z.enum(["gig", "commerce"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return tenantService.create(ctx.user, input);
    }),

  // Auto-provision a default workspace for a user who has none, so signup can
  // land directly in the product instead of forcing the /setup gate. Fully
  // idempotent: returns the user's existing/owned tenant if one is present,
  // and the generated slug retries on collision.
  provisionDefault: protectedProcedure.mutation(async ({ ctx }) => {
    return tenantService.provisionDefault(ctx.user);
  }),

  seedDemoData: protectedProcedure
    .input(
      z.object({
        tenantId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return tenantService.seedDemoData(ctx.user, input);
    }),

  // Update tenant settings
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(2).max(255).optional(),
        primaryProduct: z.enum(["gig", "commerce"]).optional(),
        domain: z.string().optional(),
        logoUrl: z.string().optional(),
        shopifyShopDomain: z.string().optional(),
        shopifyAccessToken: z.string().optional(),
        shopifySyncEnabled: z.boolean().optional(),
        n8nWebhookUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return tenantService.update(ctx.user, input);
    }),

  // Get subscription plans — cached at the Netlify edge for 1h (SWR 24h).
  getPlans: protectedProcedure.query(async ({ ctx }) => {
    setEdgeCache(ctx.res, EDGE_CACHE.public_long);
    return tenantService.getPlansUseCase();
  }),

  getUsage: protectedProcedure.query(async ({ ctx }) => {
    return tenantService.getUsage(ctx.user);
  }),

  getOAuthSettings: protectedProcedure.query(async ({ ctx }) => {
    return tenantService.getOAuthSettings(ctx.user);
  }),

  updateOAuthSettings: protectedProcedure
    .input(
      z.object({
        google: googleOAuthInputSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return tenantService.updateOAuthSettings(ctx.user, input);
    }),

  // Seed demo data for the current tenant
  seedDemo: protectedProcedure.mutation(async ({ ctx }) => {
    return tenantService.seedDemo(ctx.user);
  }),
});
