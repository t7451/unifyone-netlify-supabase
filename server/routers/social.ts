import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  socialPosts,
  socialAccounts,
  webhookEvents,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

async function requireDb() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable",
    });
  return db;
}

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
      const platformInstructions = input.platforms
        .map(p => {
          if (p === "twitter")
            return "Twitter/X: max 280 chars, punchy and direct";
          if (p === "linkedin")
            return "LinkedIn: professional tone, 1-3 paragraphs, thought leadership";
          if (p === "instagram")
            return "Instagram: visual-first, engaging caption, strong CTA";
          if (p === "facebook")
            return "Facebook: conversational, community-focused, 1-2 paragraphs";
          if (p === "tiktok")
            return "TikTok: trendy, hook in first line, Gen Z friendly";
          return p;
        })
        .join("\n");

      const systemPrompt = `You are a social media expert for UnifyOne Commerce Platform, a B2B SaaS for e-commerce store owners. 
Generate platform-specific social media posts. Each post must be optimized for its platform.
${input.includeHashtags ? "Include relevant hashtags." : "Do not include hashtags."}
${input.includeEmoji ? "Use emojis tastefully." : "Do not use emojis."}
Tone: ${input.tone}.
IMPORTANT: All posts must include FTC-compliant disclosure if promoting a product or earning referral credits.
Return a JSON object with keys matching each platform name, each containing the post text.`;

      const userPrompt = `Create social media posts about: "${input.topic}"
${input.productName ? `Product: ${input.productName}` : ""}
${input.storeUrl ? `Store URL: ${input.storeUrl}` : ""}

Platform requirements:
${platformInstructions}

Return JSON with keys: ${input.platforms.join(", ")}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "social_posts",
            strict: true,
            schema: {
              type: "object",
              properties: Object.fromEntries(
                input.platforms.map(p => [
                  p,
                  { type: "string", description: `Post content for ${p}` },
                ])
              ),
              required: input.platforms,
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      const posts = JSON.parse(typeof content === "string" ? content : "{}");
      return { posts, aiGenerated: true };
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
      const db = await requireDb();
      const tenantId = ctx.user.tenantId;
      if (!tenantId)
        throw new TRPCError({ code: "FORBIDDEN", message: "No active tenant" });

      const status = input.scheduledAt ? "scheduled" : "draft";
      const [result] = await db
        .insert(socialPosts)
        .values({
          tenantId,
          userId: ctx.user.id,
          content: input.content,
          platforms: input.platforms,
          status,
          scheduledAt: input.scheduledAt
            ? new Date(input.scheduledAt)
            : undefined,
          campaignTag: input.campaignTag,
          utmSource: "unifyone",
          utmMedium: "social",
          utmCampaign: input.utmCampaign,
          aiGenerated: input.aiGenerated,
        })
        .returning();
      return { id: result.id, status };
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
      const db = await requireDb();
      const tenantId = ctx.user.tenantId;
      if (!tenantId)
        throw new TRPCError({ code: "FORBIDDEN", message: "No active tenant" });

      const conditions = [eq(socialPosts.tenantId, tenantId)];
      if (input.status !== "all") {
        conditions.push(eq(socialPosts.status, input.status));
      }

      const posts = await db
        .select()
        .from(socialPosts)
        .where(and(...conditions))
        .orderBy(desc(socialPosts.createdAt))
        .limit(input.limit);

      return posts;
    }),

  // ── Publish Post (mark as published) ───────────────────────────────────────
  publish: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const tenantId = ctx.user.tenantId;
      if (!tenantId)
        throw new TRPCError({ code: "FORBIDDEN", message: "No active tenant" });

      await db
        .update(socialPosts)
        .set({ status: "published", publishedAt: new Date() })
        .where(
          and(
            eq(socialPosts.id, input.postId),
            eq(socialPosts.tenantId, tenantId)
          )
        );

      // Fire n8n webhook for social_share event
      try {
        const [post] = await db
          .select()
          .from(socialPosts)
          .where(eq(socialPosts.id, input.postId));
        if (post) {
          await db.insert(webhookEvents).values({
            tenantId,
            source: "internal",
            eventType: "social_share",
            payload: {
              postId: post.id,
              platforms: post.platforms,
              userId: ctx.user.id,
              campaignTag: post.campaignTag,
            },
            status: "pending",
          });
        }
      } catch {
        /* non-blocking */
      }

      return { success: true };
    }),

  // ── Delete Post ─────────────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const tenantId = ctx.user.tenantId;
      if (!tenantId)
        throw new TRPCError({ code: "FORBIDDEN", message: "No active tenant" });

      await db
        .delete(socialPosts)
        .where(
          and(
            eq(socialPosts.id, input.postId),
            eq(socialPosts.tenantId, tenantId)
          )
        );
      return { success: true };
    }),

  // ── Get Accounts ────────────────────────────────────────────────────────────
  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const tenantId = ctx.user.tenantId;
    if (!tenantId) return [];

    return db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.tenantId, tenantId));
  }),

  // ── Connect Account (stub — real OAuth per platform) ───────────────────────
  connectAccount: protectedProcedure
    .input(
      z.object({
        platform: z.enum([
          "twitter",
          "instagram",
          "linkedin",
          "facebook",
          "tiktok",
        ]),
        handle: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const tenantId = ctx.user.tenantId;
      if (!tenantId)
        throw new TRPCError({ code: "FORBIDDEN", message: "No active tenant" });

      // Upsert: update if exists, insert if not
      const existing = await db
        .select()
        .from(socialAccounts)
        .where(
          and(
            eq(socialAccounts.tenantId, tenantId),
            eq(socialAccounts.platform, input.platform)
          )
        );

      if (existing.length > 0) {
        await db
          .update(socialAccounts)
          .set({ handle: input.handle, isConnected: false })
          .where(eq(socialAccounts.id, existing[0].id));
      } else {
        await db.insert(socialAccounts).values({
          tenantId,
          platform: input.platform,
          handle: input.handle,
          isConnected: false,
        });
      }
      return { success: true };
    }),

  // ── Analytics Summary ───────────────────────────────────────────────────────
  getAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const tenantId = ctx.user.tenantId;
    if (!tenantId)
      return {
        totalPosts: 0,
        published: 0,
        scheduled: 0,
        drafts: 0,
        platforms: {},
      };

    const posts = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.tenantId, tenantId));

    const published = posts.filter(p => p.status === "published").length;
    const scheduled = posts.filter(p => p.status === "scheduled").length;
    const drafts = posts.filter(p => p.status === "draft").length;

    const platformCounts: Record<string, number> = {};
    for (const post of posts) {
      const platforms = (post.platforms as string[]) || [];
      for (const p of platforms) {
        platformCounts[p] = (platformCounts[p] || 0) + 1;
      }
    }

    return {
      totalPosts: posts.length,
      published,
      scheduled,
      drafts,
      platforms: platformCounts,
    };
  }),
});
