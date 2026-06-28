import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import * as service from "./social.service";

export const socialRouter = router({
  // ── AI Compose ──────────────────────────────────────────────────────────────
  aiCompose: protectedProcedure
    .input(
      z.object({
        topic: z.string().min(1).max(500),
        platforms: z
          .array(
            z.enum(["twitter", "instagram", "linkedin", "facebook", "tiktok"])
          )
          .min(1),
        tone: z
          .enum([
            "professional",
            "casual",
            "excited",
            "informative",
            "promotional",
          ])
          .default("professional"),
        includeHashtags: z.boolean().default(true),
        includeEmoji: z.boolean().default(false),
        productName: z.string().optional(),
        storeUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return service.aiCompose(input);
    }),

  // ── Create / Save Post ──────────────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(5000),
        platforms: z
          .array(
            z.enum(["twitter", "instagram", "linkedin", "facebook", "tiktok"])
          )
          .min(1),
        scheduledAt: z.string().datetime().optional(),
        campaignTag: z.string().max(100).optional(),
        utmCampaign: z.string().max(100).optional(),
        aiGenerated: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.createPost(ctx.user, input);
    }),

  // ── List Posts ──────────────────────────────────────────────────────────────
  list: protectedProcedure
    .input(
      z.object({
        status: z
          .enum([
            "draft",
            "scheduled",
            "published",
            "failed",
            "cancelled",
            "all",
          ])
          .default("all"),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return service.listPosts(ctx.user.tenantId, input.status, input.limit);
    }),

  // ── Publish Post ────────────────────────────────────────────────────────────
  // Two distribution paths run together:
  //  1. Native publish to the tenant's connected accounts (e.g. Bluesky) via the
  //     provider adapters, returning a per-target outcome list.
  //  2. The `social.post.published` automation event — kept in place so
  //     operator-configured n8n / Zapier flows continue to work for platforms
  //     UnifyOne does not natively publish to.
  // Both are best-effort and never block marking the post published.
  publish: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return service.publishPost(ctx.user, input.postId);
    }),

  // ── Delete Post ─────────────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return service.deletePost(ctx.user.tenantId, input.postId);
    }),

  // ── Analytics Summary ───────────────────────────────────────────────────────
  getAnalytics: protectedProcedure.query(async ({ ctx }) => {
    return service.getAnalytics(ctx.user.tenantId);
  }),
});
