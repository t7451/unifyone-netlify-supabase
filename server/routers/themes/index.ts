import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../../_core/trpc";
import * as service from "./themes.service";

/**
 * Transport layer for the themes marketplace router. Procedures + zod schemas
 * live here; the mapping/filtering, install/review flows, admin CRUD (with
 * inline role checks) and Stripe checkout live in themes.service.ts and data
 * access in themes.repo.ts. The exported router name/shape is unchanged.
 */
export const themesRouter = router({
  // ── Public: list published themes ──────────────────────────────────────────
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        categoryId: z.number().optional(),
        priceType: z.enum(["free", "paid", "subscription"]).optional(),
        complexity: z.enum(["starter", "standard", "advanced"]).optional(),
        featured: z.boolean().optional(),
        sortBy: z
          .enum(["newest", "popular", "rating", "price_asc", "price_desc"])
          .default("newest"),
        limit: z.number().min(1).max(100).default(24),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      return service.list(input);
    }),

  // ── Public: get single theme by slug ───────────────────────────────────────
  get: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      return service.get(input.slug);
    }),

  // ── Public: list categories ─────────────────────────────────────────────────
  listCategories: publicProcedure.query(async () => {
    return service.listCategories();
  }),

  // ── Public: get approved reviews for a theme ───────────────────────────────
  getReviews: publicProcedure
    .input(z.object({ themeId: z.number() }))
    .query(async ({ input }) => {
      return service.getReviews(input.themeId);
    }),

  // ── Protected: check if user has installed a theme ─────────────────────────
  checkInstalled: protectedProcedure
    .input(z.object({ themeId: z.number() }))
    .query(async ({ ctx, input }) => {
      return service.checkInstalled(input.themeId, ctx.user.id);
    }),

  // ── Protected: list user's installed themes ────────────────────────────────
  myThemes: protectedProcedure.query(async ({ ctx }) => {
    return service.myThemes(ctx.user.id);
  }),

  // ── Protected: install a free theme ────────────────────────────────────────
  installFree: protectedProcedure
    .input(z.object({ themeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return service.installFree(ctx.user, input.themeId);
    }),

  // ── Protected: submit a review ─────────────────────────────────────────────
  submitReview: protectedProcedure
    .input(
      z.object({
        themeId: z.number(),
        rating: z.number().min(1).max(5),
        title: z.string().max(200).optional(),
        body: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.submitReview(ctx.user.id, input);
    }),

  // ── Admin: create a theme ───────────────────────────────────────────────────
  adminCreate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        slug: z.string().min(1).max(200),
        description: z.string().optional(),
        longDescription: z.string().optional(),
        categoryId: z.number().optional(),
        priceType: z.enum(["free", "paid", "subscription"]).default("free"),
        price: z.string().default("0.00"),
        stripePriceId: z.string().optional(),
        previewUrl: z.string().url().optional(),
        thumbnailUrl: z.string().url().optional(),
        screenshotUrls: z.array(z.string().url()).default([]),
        downloadUrl: z.string().url().optional(),
        tags: z.array(z.string()).default([]),
        industry: z.string().optional(),
        complexity: z
          .enum(["starter", "standard", "advanced"])
          .default("standard"),
        features: z.array(z.string()).default([]),
        techStack: z.array(z.string()).default([]),
        status: z
          .enum(["draft", "pending_review", "published", "archived"])
          .default("draft"),
        featured: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.adminCreate(ctx.user, input);
    }),

  // ── Admin: update a theme ───────────────────────────────────────────────────
  adminUpdate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        longDescription: z.string().optional(),
        categoryId: z.number().optional(),
        priceType: z.enum(["free", "paid", "subscription"]).optional(),
        price: z.string().optional(),
        stripePriceId: z.string().optional(),
        previewUrl: z.string().url().optional(),
        thumbnailUrl: z.string().url().optional(),
        screenshotUrls: z.array(z.string().url()).optional(),
        downloadUrl: z.string().url().optional(),
        tags: z.array(z.string()).optional(),
        industry: z.string().optional(),
        complexity: z.enum(["starter", "standard", "advanced"]).optional(),
        features: z.array(z.string()).optional(),
        techStack: z.array(z.string()).optional(),
        status: z
          .enum(["draft", "pending_review", "published", "archived"])
          .optional(),
        featured: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.adminUpdate(ctx.user.role, input);
    }),

  // ── Admin: archive a theme ──────────────────────────────────────────────────
  adminDelete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return service.adminDelete(ctx.user.role, input.id);
    }),

  // ── Admin: list all themes (any status) ────────────────────────────────────
  adminList: protectedProcedure.query(async ({ ctx }) => {
    return service.adminList(ctx.user.role);
  }),

  // ── Admin: list reviews ─────────────────────────────────────────────────────
  adminListReviews: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return service.adminListReviews(ctx.user.role, input.status);
    }),

  adminUpdateReview: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "approved", "rejected"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.adminUpdateReview(ctx.user.role, input);
    }),

  // ── Protected: create Stripe checkout for paid theme ─────────────────────
  createCheckout: protectedProcedure
    .input(
      z.object({
        themeId: z.number(),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.createCheckout(ctx.user, input);
    }),

  // ── Admin: create category ─────────────────────────────────────────────────
  adminCreateCategory: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(100),
        description: z.string().optional(),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.adminCreateCategory(ctx.user.role, input);
    }),
});
