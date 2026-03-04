import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  themes, themeCategories, themeInstalls, themeReviews,
} from "../../drizzle/schema";
import { eq, and, desc, sql, asc } from "drizzle-orm";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-01-27.acacia" as any })
  : null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
}

function mapTheme(t: typeof themes.$inferSelect) {
  return {
    ...t,
    screenshotUrls: safeArray(t.screenshotUrls),
    tags: safeArray(t.tags),
    features: safeArray(t.features),
    techStack: safeArray(t.techStack),
    price: t.price ? String(t.price) : "0.00",
    averageRating: t.averageRating ? String(t.averageRating) : "0.00",
  };
}

// ── Router ────────────────────────────────────────────────────────────────────
export const themesRouter = router({
  // ── Public: list published themes ──────────────────────────────────────────
  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      categoryId: z.number().optional(),
      priceType: z.enum(["free", "paid", "subscription"]).optional(),
      complexity: z.enum(["starter", "standard", "advanced"]).optional(),
      featured: z.boolean().optional(),
      sortBy: z.enum(["newest", "popular", "rating", "price_asc", "price_desc"]).default("newest"),
      limit: z.number().min(1).max(100).default(24),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let rows = await db
        .select()
        .from(themes)
        .where(eq(themes.status, "published"))
        .limit(input.limit)
        .offset(input.offset);

      if (input.search) {
        const q = input.search.toLowerCase();
        rows = rows.filter(t =>
          t.name.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q)
        );
      }
      if (input.categoryId) rows = rows.filter(t => t.categoryId === input.categoryId);
      if (input.priceType) rows = rows.filter(t => t.priceType === input.priceType);
      if (input.complexity) rows = rows.filter(t => t.complexity === input.complexity);
      if (input.featured) rows = rows.filter(t => t.featured);

      if (input.sortBy === "popular") rows.sort((a, b) => b.installCount - a.installCount);
      else if (input.sortBy === "rating") rows.sort((a, b) => Number(b.averageRating) - Number(a.averageRating));
      else if (input.sortBy === "price_asc") rows.sort((a, b) => Number(a.price) - Number(b.price));
      else if (input.sortBy === "price_desc") rows.sort((a, b) => Number(b.price) - Number(a.price));

      return rows.map(mapTheme);
    }),

  // ── Public: get single theme by slug ───────────────────────────────────────
  get: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [theme] = await db
        .select()
        .from(themes)
        .where(eq(themes.slug, input.slug))
        .limit(1);
      if (!theme) throw new TRPCError({ code: "NOT_FOUND", message: "Theme not found" });
      return mapTheme(theme);
    }),

  // ── Public: list categories ─────────────────────────────────────────────────
  listCategories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(themeCategories).orderBy(asc(themeCategories.sortOrder));
  }),

  // ── Public: get approved reviews for a theme ───────────────────────────────
  getReviews: publicProcedure
    .input(z.object({ themeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(themeReviews)
        .where(and(
          eq(themeReviews.themeId, input.themeId),
          eq(themeReviews.status, "approved")
        ))
        .orderBy(desc(themeReviews.createdAt))
        .limit(50);
    }),

  // ── Protected: check if user has installed a theme ─────────────────────────
  checkInstalled: protectedProcedure
    .input(z.object({ themeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { installed: false, install: null };
      const [install] = await db
        .select()
        .from(themeInstalls)
        .where(and(
          eq(themeInstalls.themeId, input.themeId),
          eq(themeInstalls.userId, ctx.user.id)
        ))
        .limit(1);
      return { installed: Boolean(install), install: install ?? null };
    }),

  // ── Protected: list user's installed themes ────────────────────────────────
  myThemes: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const installs = await db
      .select()
      .from(themeInstalls)
      .where(eq(themeInstalls.userId, ctx.user.id))
      .orderBy(desc(themeInstalls.installedAt));

    if (!installs.length) return [];

    const allThemes = await db.select().from(themes);
    const themeMap = new Map(allThemes.map(t => [t.id, t]));

    return installs.map(install => ({
      ...install,
      theme: themeMap.has(install.themeId) ? mapTheme(themeMap.get(install.themeId)!) : null,
    }));
  }),

  // ── Protected: install a free theme ────────────────────────────────────────
  installFree: protectedProcedure
    .input(z.object({ themeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [theme] = await db
        .select()
        .from(themes)
        .where(and(eq(themes.id, input.themeId), eq(themes.status, "published")))
        .limit(1);

      if (!theme) throw new TRPCError({ code: "NOT_FOUND", message: "Theme not found" });
      if (theme.priceType !== "free") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This theme requires purchase" });
      }

      const [existing] = await db
        .select()
        .from(themeInstalls)
        .where(and(
          eq(themeInstalls.themeId, input.themeId),
          eq(themeInstalls.userId, ctx.user.id)
        ))
        .limit(1);

      if (existing) return { success: true, alreadyInstalled: true };

      await db.insert(themeInstalls).values({
        themeId: input.themeId,
        userId: ctx.user.id,
        tenantId: ctx.user.tenantId ?? undefined,
        amountPaid: "0.00",
      });

      await db
        .update(themes)
        .set({ installCount: sql`${themes.installCount} + 1` })
        .where(eq(themes.id, input.themeId));

      return { success: true, alreadyInstalled: false };
    }),

  // ── Protected: submit a review ─────────────────────────────────────────────
  submitReview: protectedProcedure
    .input(z.object({
      themeId: z.number(),
      rating: z.number().min(1).max(5),
      title: z.string().max(200).optional(),
      body: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [install] = await db
        .select()
        .from(themeInstalls)
        .where(and(
          eq(themeInstalls.themeId, input.themeId),
          eq(themeInstalls.userId, ctx.user.id)
        ))
        .limit(1);
      if (!install) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You must install a theme before reviewing it" });
      }

      await db.insert(themeReviews).values({
        themeId: input.themeId,
        userId: ctx.user.id,
        rating: input.rating,
        title: input.title ?? null,
        body: input.body ?? null,
        status: "pending",
      });

      await db
        .update(themes)
        .set({ reviewCount: sql`${themes.reviewCount} + 1` })
        .where(eq(themes.id, input.themeId));

      return { success: true };
    }),

  // ── Admin: create a theme ───────────────────────────────────────────────────
  adminCreate: protectedProcedure
    .input(z.object({
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
      complexity: z.enum(["starter", "standard", "advanced"]).default("standard"),
      features: z.array(z.string()).default([]),
      techStack: z.array(z.string()).default([]),
      status: z.enum(["draft", "pending_review", "published", "archived"]).default("draft"),
      featured: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(themes).values({
        ...input,
        authorId: ctx.user.id,
        screenshotUrls: input.screenshotUrls as any,
        tags: input.tags as any,
        features: input.features as any,
        techStack: input.techStack as any,
      });
      return { success: true };
    }),

  // ── Admin: update a theme ───────────────────────────────────────────────────
  adminUpdate: protectedProcedure
    .input(z.object({
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
      status: z.enum(["draft", "pending_review", "published", "archived"]).optional(),
      featured: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...rest } = input;
      await db.update(themes).set(rest as any).where(eq(themes.id, id));
      return { success: true };
    }),

  // ── Admin: archive a theme ──────────────────────────────────────────────────
  adminDelete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(themes).set({ status: "archived" }).where(eq(themes.id, input.id));
      return { success: true };
    }),

  // ── Admin: list all themes (any status) ────────────────────────────────────
  adminList: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(themes).orderBy(desc(themes.createdAt));
    return rows.map(mapTheme);
  }),

  // ── Admin: list reviews ─────────────────────────────────────────────────────
  adminListReviews: protectedProcedure
    .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await getDb();
      if (!db) return [];
      let rows = await db.select().from(themeReviews).orderBy(desc(themeReviews.createdAt));
      if (input.status) rows = rows.filter(r => r.status === input.status);
      return rows;
    }),

  adminUpdateReview: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "approved", "rejected"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(themeReviews).set({ status: input.status }).where(eq(themeReviews.id, input.id));
      return { success: true };
    }),

  // ── Protected: create Stripe checkout for paid theme ─────────────────────
  createCheckout: protectedProcedure
    .input(z.object({
      themeId: z.number(),
      origin: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [theme] = await db
        .select()
        .from(themes)
        .where(and(eq(themes.id, input.themeId), eq(themes.status, "published")))
        .limit(1);

      if (!theme) throw new TRPCError({ code: "NOT_FOUND", message: "Theme not found" });
      if (theme.priceType === "free") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Use installFree for free themes" });
      }

      // Check if already purchased
      const [existing] = await db
        .select()
        .from(themeInstalls)
        .where(and(
          eq(themeInstalls.themeId, input.themeId),
          eq(themeInstalls.userId, ctx.user.id)
        ))
        .limit(1);
      if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Already purchased" });

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: theme.priceType === "subscription" ? "subscription" : "payment",
        payment_method_types: ["card"],
        customer_email: ctx.user.email ?? undefined,
        allow_promotion_codes: true,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          theme_id: theme.id.toString(),
          user_id: ctx.user.id.toString(),
          customer_email: ctx.user.email ?? "",
          customer_name: ctx.user.name ?? "",
          purchase_type: "theme",
        },
        success_url: `${input.origin}/themes?purchase=success&theme=${theme.slug}`,
        cancel_url: `${input.origin}/themes?purchase=cancelled`,
        line_items: theme.stripePriceId
          ? [{ price: theme.stripePriceId, quantity: 1 }]
          : [{
              price_data: {
                currency: "usd",
                unit_amount: Math.round(Number(theme.price) * 100),
                product_data: {
                  name: theme.name,
                  description: theme.description ?? "UnifyOne Theme",
                  images: theme.thumbnailUrl ? [theme.thumbnailUrl] : [],
                },
              },
              quantity: 1,
            }],
      };

      const session = await stripe.checkout.sessions.create(sessionParams);
      return { url: session.url };
    }),

  // ── Admin: create category ─────────────────────────────────────────────────
  adminCreateCategory: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      slug: z.string().min(1).max(100),
      description: z.string().optional(),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(themeCategories).values(input);
      return { success: true };
    }),
});
