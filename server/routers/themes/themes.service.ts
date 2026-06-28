import { TRPCError } from "@trpc/server";
import type Stripe from "stripe";
import { getStripe } from "../../_core/stripeClient";
import {
  getDb,
  themes,
  themeCategories,
  selectPublishedThemes,
  selectThemeBySlug,
  selectCategories,
  selectApprovedReviews,
  selectInstall,
  selectUserInstalls,
  selectAllThemes,
  selectPublishedThemeById,
  insertInstall,
  bumpInstallCount,
  insertReview,
  bumpReviewCount,
  insertTheme,
  updateTheme,
  setThemeStatus,
  selectAllThemesOrdered,
  selectAllReviews,
  setReviewStatus,
  insertCategory,
} from "./themes.repo";

/**
 * Use-case layer for the themes marketplace. Holds the mapping helpers, the
 * in-memory filtering/sorting of the public list, the install/review flows, the
 * admin CRUD (with inline role checks preserved from the original router) and
 * the Stripe checkout. Transport stays in index.ts and data access in
 * themes.repo.ts. Queries and side-effect order are unchanged.
 */

const stripe = getStripe();

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
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

function requireAdmin(role: string) {
  if (role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
}

interface ListInput {
  search?: string;
  categoryId?: number;
  priceType?: "free" | "paid" | "subscription";
  complexity?: "starter" | "standard" | "advanced";
  featured?: boolean;
  sortBy: "newest" | "popular" | "rating" | "price_asc" | "price_desc";
  limit: number;
  offset: number;
}

export async function list(input: ListInput) {
  const db = await getDb();
  if (!db) return [];

  let rows = await selectPublishedThemes(db, input.limit, input.offset);

  if (input.search) {
    const q = input.search.toLowerCase();
    rows = rows.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
    );
  }
  if (input.categoryId)
    rows = rows.filter(t => t.categoryId === input.categoryId);
  if (input.priceType) rows = rows.filter(t => t.priceType === input.priceType);
  if (input.complexity)
    rows = rows.filter(t => t.complexity === input.complexity);
  if (input.featured) rows = rows.filter(t => t.featured);

  if (input.sortBy === "popular")
    rows.sort((a, b) => b.installCount - a.installCount);
  else if (input.sortBy === "rating")
    rows.sort((a, b) => Number(b.averageRating) - Number(a.averageRating));
  else if (input.sortBy === "price_asc")
    rows.sort((a, b) => Number(a.price) - Number(b.price));
  else if (input.sortBy === "price_desc")
    rows.sort((a, b) => Number(b.price) - Number(a.price));

  return rows.map(mapTheme);
}

export async function get(slug: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const [theme] = await selectThemeBySlug(db, slug);
  if (!theme)
    throw new TRPCError({ code: "NOT_FOUND", message: "Theme not found" });
  return mapTheme(theme);
}

export async function listCategories() {
  const db = await getDb();
  if (!db) return [];
  return selectCategories(db);
}

export async function getReviews(themeId: number) {
  const db = await getDb();
  if (!db) return [];
  return selectApprovedReviews(db, themeId);
}

export async function checkInstalled(themeId: number, userId: number) {
  const db = await getDb();
  if (!db) return { installed: false, install: null };
  const [install] = await selectInstall(db, themeId, userId);
  return { installed: Boolean(install), install: install ?? null };
}

export async function myThemes(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const installs = await selectUserInstalls(db, userId);

  if (!installs.length) return [];

  const allThemes = await selectAllThemes(db);
  const themeMap = new Map(allThemes.map(t => [t.id, t]));

  return installs.map(install => ({
    ...install,
    theme: themeMap.has(install.themeId)
      ? mapTheme(themeMap.get(install.themeId)!)
      : null,
  }));
}

export async function installFree(
  user: { id: number; tenantId: number | null },
  themeId: number
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

  const [theme] = await selectPublishedThemeById(db, themeId);

  if (!theme)
    throw new TRPCError({ code: "NOT_FOUND", message: "Theme not found" });
  if (theme.priceType !== "free") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This theme requires purchase",
    });
  }

  const [existing] = await selectInstall(db, themeId, user.id);

  if (existing) return { success: true, alreadyInstalled: true };

  await insertInstall(db, {
    themeId,
    userId: user.id,
    tenantId: user.tenantId ?? undefined,
    amountPaid: "0.00",
  });

  await bumpInstallCount(db, themeId);

  return { success: true, alreadyInstalled: false };
}

export async function submitReview(
  userId: number,
  input: { themeId: number; rating: number; title?: string; body?: string }
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

  const [install] = await selectInstall(db, input.themeId, userId);
  if (!install) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must install a theme before reviewing it",
    });
  }

  await insertReview(db, {
    themeId: input.themeId,
    userId,
    rating: input.rating,
    title: input.title ?? null,
    body: input.body ?? null,
    status: "pending",
  });

  await bumpReviewCount(db, input.themeId);

  return { success: true };
}

export async function adminCreate(
  user: { id: number; role: string },
  input: Omit<typeof themes.$inferInsert, "authorId"> & {
    screenshotUrls: string[];
    tags: string[];
    features: string[];
    techStack: string[];
  }
) {
  requireAdmin(user.role);
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  await insertTheme(db, {
    ...input,
    authorId: user.id,
    screenshotUrls: input.screenshotUrls,
    tags: input.tags,
    features: input.features,
    techStack: input.techStack,
  });
  return { success: true };
}

export async function adminUpdate(
  role: string,
  input: { id: number } & Partial<typeof themes.$inferInsert>
) {
  requireAdmin(role);
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const { id, ...rest } = input;
  await updateTheme(db, id, rest as Partial<typeof themes.$inferInsert>);
  return { success: true };
}

export async function adminDelete(role: string, id: number) {
  requireAdmin(role);
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  await setThemeStatus(db, id, "archived");
  return { success: true };
}

export async function adminList(role: string) {
  requireAdmin(role);
  const db = await getDb();
  if (!db) return [];
  const rows = await selectAllThemesOrdered(db);
  return rows.map(mapTheme);
}

export async function adminListReviews(
  role: string,
  status?: "pending" | "approved" | "rejected"
) {
  requireAdmin(role);
  const db = await getDb();
  if (!db) return [];
  let rows = await selectAllReviews(db);
  if (status) rows = rows.filter(r => r.status === status);
  return rows;
}

export async function adminUpdateReview(
  role: string,
  input: { id: number; status: "pending" | "approved" | "rejected" }
) {
  requireAdmin(role);
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  await setReviewStatus(db, input.id, input.status);
  return { success: true };
}

export async function createCheckout(
  user: { id: number; email?: string | null; name?: string | null },
  input: { themeId: number; origin: string }
) {
  if (!stripe)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Stripe not configured",
    });
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

  const [theme] = await selectPublishedThemeById(db, input.themeId);

  if (!theme)
    throw new TRPCError({ code: "NOT_FOUND", message: "Theme not found" });
  if (theme.priceType === "free") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Use installFree for free themes",
    });
  }

  // Check if already purchased
  const [existing] = await selectInstall(db, input.themeId, user.id);
  if (existing)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Already purchased",
    });

  // Guard against corrupt/NULL theme.price — Math.round(NaN) is 0, which
  // would create a $0 paid checkout (free theme). Require a positive price
  // unless an explicit Stripe price ID is configured.
  const themeUnitAmount = Math.round(Number(theme.price) * 100);
  if (
    !theme.stripePriceId &&
    (!Number.isFinite(themeUnitAmount) || themeUnitAmount <= 0)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This theme is not available for purchase (invalid price).",
    });
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: theme.priceType === "subscription" ? "subscription" : "payment",
    payment_method_types: ["card"],
    customer_email: user.email ?? undefined,
    allow_promotion_codes: true,
    client_reference_id: user.id.toString(),
    metadata: {
      theme_id: theme.id.toString(),
      user_id: user.id.toString(),
      customer_email: user.email ?? "",
      customer_name: user.name ?? "",
      purchase_type: "theme",
    },
    success_url: `${input.origin}/themes?purchase=success&theme=${theme.slug}`,
    cancel_url: `${input.origin}/themes?purchase=cancelled`,
    line_items: theme.stripePriceId
      ? [{ price: theme.stripePriceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: "usd",
              unit_amount: themeUnitAmount,
              product_data: {
                name: theme.name,
                description: theme.description ?? "UnifyOne Theme",
                images: theme.thumbnailUrl ? [theme.thumbnailUrl] : [],
              },
            },
            quantity: 1,
          },
        ],
  };

  const session = await stripe.checkout.sessions.create(sessionParams);
  return { url: session.url };
}

export async function adminCreateCategory(
  role: string,
  input: typeof themeCategories.$inferInsert
) {
  requireAdmin(role);
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  await insertCategory(db, input);
  return { success: true };
}
