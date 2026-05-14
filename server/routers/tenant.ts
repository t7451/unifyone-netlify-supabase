import { TRPCError } from "@trpc/server";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import {
  kaiCreditLedger,
  products,
  type InsertProduct,
} from "../../drizzle/schema";
import {
  createTenant,
  getAllTenants,
  getDb,
  getPlans,
  getTenantById,
  getTenantsByOwner,
  getTenantBySlug,
  updateTenant,
  updateUserTenant,
  createProduct,
  upsertInventory,
  createOrder,
  upsertCustomer,
  createCategory,
  getProductCount,
  getOrderCountThisMonth,
  getUserCount,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { setEdgeCache, EDGE_CACHE } from "../_core/cacheControl";

const googleOAuthInputSchema = z.object({
  enabled: z.boolean(),
  clientId: z.string().trim().max(255),
  clientSecret: z.string().trim().max(255).optional(),
  redirectUri: z.string().trim().url().or(z.literal("")),
  scopes: z.string().trim().max(500),
});

type GoogleOAuthSettings = {
  enabled: boolean;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string;
};

const DEFAULT_GOOGLE_OAUTH_SCOPES =
  "openid email profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

function getTenantSettingsObject(
  settings: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  return settings && typeof settings === "object" ? { ...settings } : {};
}

function readGoogleOAuthSettings(
  settings: Record<string, unknown> | null | undefined
): GoogleOAuthSettings {
  const settingsObject = getTenantSettingsObject(settings);
  const raw =
    settingsObject.googleOAuth &&
    typeof settingsObject.googleOAuth === "object" &&
    !Array.isArray(settingsObject.googleOAuth)
      ? (settingsObject.googleOAuth as Record<string, unknown>)
      : {};

  return {
    enabled: raw.enabled === true,
    clientId: typeof raw.clientId === "string" ? raw.clientId : "",
    clientSecret:
      typeof raw.clientSecret === "string" ? raw.clientSecret : undefined,
    redirectUri: typeof raw.redirectUri === "string" ? raw.redirectUri : "",
    scopes:
      typeof raw.scopes === "string" && raw.scopes.trim().length > 0
        ? raw.scopes
        : DEFAULT_GOOGLE_OAUTH_SCOPES,
  };
}

function canManageTenantSettings(
  tenant: Awaited<ReturnType<typeof getTenantById>>,
  userId: number,
  role: string
): boolean {
  return Boolean(tenant && (tenant.ownerId === userId || role === "admin"));
}

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
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const tenant = await getTenantById(input.id);
      if (
        !tenant ||
        (tenant.ownerId !== ctx.user.id && ctx.user.role !== "admin")
      )
        throw new TRPCError({ code: "NOT_FOUND" });
      return tenant;
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
      const existing = await getTenantBySlug(input.slug);
      return { available: !existing };
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check whether a tenant with this slug already exists so we can give
      // a precise error or resume an interrupted setup flow idempotently.
      const existing = await getTenantBySlug(input.slug);
      if (existing) {
        if (existing.ownerId !== ctx.user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `The slug "${input.slug}" is already taken. Please choose a different one.`,
          });
        }
        // The same owner already created this tenant (e.g. a retry after a
        // network failure). Resume the setup flow with the existing record.
        await updateUserTenant(ctx.user.id, existing.id, {
          promoteToAdmin: true,
        });
        return existing;
      }

      let newTenant;
      try {
        newTenant = await createTenant({
          name: input.name,
          slug: input.slug,
          ownerId: ctx.user.id,
        });
      } catch (err) {
        // PostgreSQL SQLSTATE 23505 = unique_violation.  Neon's error objects
        // expose the SQLSTATE via a `code` property, so we check that first
        // before falling back to message inspection for safety.
        const pgCode = (err as { code?: string }).code;
        const codeIsUniqueViolation = pgCode === "23505";
        const messageIsUniqueViolation =
          !codeIsUniqueViolation &&
          err instanceof Error &&
          (err.message.includes("unique") ||
            err.message.includes("tenants_slug_unique"));

        if (messageIsUniqueViolation) {
          // Log when we fall through to message-inspection so we can monitor
          // if this path fires on unrelated errors (would indicate a driver change).
          console.warn(
            "[tenant.create] unique-violation detected via message inspection (no PG code)",
            { message: (err as Error).message }
          );
        }

        const isUniqueViolation =
          codeIsUniqueViolation || messageIsUniqueViolation;
        if (isUniqueViolation) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `The slug "${input.slug}" is already taken. Please choose a different one.`,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create store. Please try again.",
          cause: err,
        });
      }

      if (!newTenant) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Store was created but could not be retrieved. Please refresh and try again.",
        });
      }
      await updateUserTenant(ctx.user.id, newTenant.id, {
        promoteToAdmin: true,
      });

      // Grant starter Kai credits so new tenants can use Kai immediately.
      // Non-blocking — don't fail tenant creation if the credit insert errors.
      void (async () => {
        try {
          const db = await getDb();
          if (db) {
            await db
              .insert(kaiCreditLedger)
              .values({
                tenantId: newTenant.id,
                userId: ctx.user.id,
                type: "adjustment",
                creditDelta: 25,
                idempotencyKey: `starter_grant:t${newTenant.id}:u${ctx.user.id}`,
                description: "Welcome — 25 starter Kai credits",
                metadata: { reason: "starter_grant" },
              })
              .onConflictDoNothing({
                target: kaiCreditLedger.idempotencyKey,
              });
          }
        } catch {
          // Intentionally non-fatal — tenant creation succeeds regardless.
        }
      })();

      void import("../auditLogger").then(({ logAudit }) =>
        logAudit({
          action: "tenant.created",
          resource: "tenant",
          resourceId: String(newTenant.id),
          severity: "low",
          userId: ctx.user.id,
          metadata: { name: input.name, slug: input.slug },
        }).catch(() => {})
      );
      return newTenant;
    }),

  seedDemoData: protectedProcedure
    .input(
      z.object({
        tenantId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getTenantById(input.tenantId);
      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (
        tenant.ownerId !== ctx.user.id &&
        ctx.user.role !== "admin" &&
        ctx.user.tenantId !== tenant.id
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable.",
        });
      }

      const [{ productCount }] = await db
        .select({ productCount: count() })
        .from(products)
        .where(eq(products.tenantId, input.tenantId));

      if (productCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Demo products can only be added to an empty store.",
        });
      }

      const demoProducts: InsertProduct[] = [
        {
          tenantId: input.tenantId,
          name: "Classic Logo T-Shirt",
          slug: "classic-logo-t-shirt",
          description:
            "A soft cotton tee with a clean UnifyOne-inspired storefront logo.",
          sku: "DEMO-TSHIRT-001",
          price: "24.00",
          imageUrl:
            "https://placehold.co/600x600/png?text=Classic+Logo+T-Shirt",
          images: [
            "https://placehold.co/600x600/png?text=Classic+Logo+T-Shirt",
          ],
          tags: ["demo", "apparel", "t-shirt"],
          status: "active",
          trackInventory: true,
        },
        {
          tenantId: input.tenantId,
          name: "Minimalist Coffee Mug",
          slug: "minimalist-coffee-mug",
          description:
            "A glossy ceramic mug for your morning brew and merch table.",
          sku: "DEMO-MUG-001",
          price: "18.00",
          imageUrl:
            "https://placehold.co/600x600/png?text=Minimalist+Coffee+Mug",
          images: [
            "https://placehold.co/600x600/png?text=Minimalist+Coffee+Mug",
          ],
          tags: ["demo", "drinkware", "mug"],
          status: "active",
          trackInventory: true,
        },
        {
          tenantId: input.tenantId,
          name: "Vinyl Sticker Pack",
          slug: "vinyl-sticker-pack",
          description: "A weatherproof 5-pack of laptop-ready brand stickers.",
          sku: "DEMO-STICKER-001",
          price: "9.50",
          imageUrl: "https://placehold.co/600x600/png?text=Vinyl+Sticker+Pack",
          images: ["https://placehold.co/600x600/png?text=Vinyl+Sticker+Pack"],
          tags: ["demo", "accessories", "stickers"],
          status: "active",
          trackInventory: true,
        },
        {
          tenantId: input.tenantId,
          name: "Heavyweight Zip Hoodie",
          slug: "heavyweight-zip-hoodie",
          description: "A cozy midweight hoodie for cool warehouse mornings.",
          sku: "DEMO-HOODIE-001",
          price: "54.00",
          imageUrl:
            "https://placehold.co/600x600/png?text=Heavyweight+Zip+Hoodie",
          images: [
            "https://placehold.co/600x600/png?text=Heavyweight+Zip+Hoodie",
          ],
          tags: ["demo", "apparel", "hoodie"],
          status: "active",
          trackInventory: true,
        },
        {
          tenantId: input.tenantId,
          name: "Canvas Market Tote",
          slug: "canvas-market-tote",
          description:
            "A durable reusable tote for pop-up shops and everyday errands.",
          sku: "DEMO-TOTE-001",
          price: "28.00",
          imageUrl: "https://placehold.co/600x600/png?text=Canvas+Market+Tote",
          images: ["https://placehold.co/600x600/png?text=Canvas+Market+Tote"],
          tags: ["demo", "accessories", "tote"],
          status: "active",
          trackInventory: true,
        },
      ];

      await db.insert(products).values(demoProducts);

      return {
        success: true,
        productsCreated: demoProducts.length,
      };
    }),

  // Update tenant settings
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(2).max(255).optional(),
        domain: z.string().optional(),
        logoUrl: z.string().optional(),
        shopifyShopDomain: z.string().optional(),
        shopifyAccessToken: z.string().optional(),
        shopifySyncEnabled: z.boolean().optional(),
        n8nWebhookUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getTenantById(input.id);
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });
      if (tenant.ownerId !== ctx.user.id && ctx.user.role !== "admin")
        throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      await updateTenant(
        id,
        data,
        ctx.user.role !== "admin" ? ctx.user.id : undefined
      );
      return getTenantById(id);
    }),

  // Get subscription plans — cached at the Netlify edge for 1h (SWR 24h).
  getPlans: protectedProcedure.query(async ({ ctx }) => {
    setEdgeCache(ctx.res, EDGE_CACHE.public_long);
    return getPlans();
  }),

  getUsage: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    if (!tenantId) {
      return {
        productCount: 0,
        orderCount: 0,
        userCount: 0,
      };
    }

    const [productCount, orderCount, userCount] = await Promise.all([
      getProductCount(tenantId),
      getOrderCountThisMonth(tenantId),
      getUserCount(tenantId),
    ]);

    return {
      productCount: Number(productCount),
      orderCount: Number(orderCount),
      userCount: Number(userCount),
    };
  }),

  getOAuthSettings: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    if (!tenantId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active tenant. Create a store first.",
      });
    }

    const tenant = await getTenantById(tenantId);
    if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

    const google = readGoogleOAuthSettings(
      (tenant.settings as Record<string, unknown> | null | undefined) ?? null
    );

    return {
      google: {
        enabled: google.enabled,
        clientId: google.clientId,
        redirectUri: google.redirectUri,
        scopes: google.scopes,
        hasClientSecret: Boolean(google.clientSecret),
        callbackUrl:
          google.redirectUri || "Use your Google app callback URL here",
      },
    };
  }),

  updateOAuthSettings: protectedProcedure
    .input(
      z.object({
        google: googleOAuthInputSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      if (!tenantId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active tenant. Create a store first.",
        });
      }

      const tenant = await getTenantById(tenantId);
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canManageTenantSettings(tenant, ctx.user.id, ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const existingSettings = getTenantSettingsObject(
        (tenant.settings as Record<string, unknown> | null | undefined) ?? null
      );
      const existingGoogle = readGoogleOAuthSettings(
        (tenant.settings as Record<string, unknown> | null | undefined) ?? null
      );

      const nextGoogle = {
        enabled: input.google.enabled,
        clientId: input.google.clientId,
        clientSecret:
          input.google.clientSecret && input.google.clientSecret.length > 0
            ? input.google.clientSecret
            : existingGoogle.clientSecret,
        redirectUri: input.google.redirectUri,
        scopes: input.google.scopes || DEFAULT_GOOGLE_OAUTH_SCOPES,
      };

      await updateTenant(
        tenantId,
        {
          settings: {
            ...existingSettings,
            googleOAuth: nextGoogle,
          },
          updatedAt: new Date(),
        },
        ctx.user.role !== "admin" ? ctx.user.id : undefined
      );

      return {
        success: true,
        google: {
          enabled: nextGoogle.enabled,
          clientId: nextGoogle.clientId,
          redirectUri: nextGoogle.redirectUri,
          scopes: nextGoogle.scopes,
          hasClientSecret: Boolean(nextGoogle.clientSecret),
        },
      };
    }),

  // Seed demo data for the current tenant
  seedDemo: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    if (!tenantId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active tenant. Create a store first.",
      });

    // Create categories (returns void, fetch them after)
    await createCategory(
      tenantId,
      "Apparel",
      "apparel-" + Date.now(),
      "Clothing and accessories"
    );
    await createCategory(
      tenantId,
      "Industrial",
      "industrial-" + Date.now(),
      "Industrial supplies"
    );

    // Create demo products
    const demoProducts = [
      {
        name: "Premium Hoodie",
        price: 59.99,
        sku: "APP-001",
        status: "active" as const,
        stock: 45,
        threshold: 10,
      },
      {
        name: "Work Gloves XL",
        price: 24.99,
        sku: "IND-001",
        status: "active" as const,
        stock: 120,
        threshold: 20,
      },
      {
        name: "Safety Vest",
        price: 18.5,
        sku: "IND-002",
        status: "active" as const,
        stock: 8,
        threshold: 15,
      },
      {
        name: "Graphic Tee",
        price: 29.99,
        sku: "APP-002",
        status: "active" as const,
        stock: 62,
        threshold: 10,
      },
      {
        name: "Steel Toe Boots",
        price: 129.0,
        sku: "IND-003",
        status: "active" as const,
        stock: 22,
        threshold: 5,
      },
      {
        name: "Fleece Jacket",
        price: 79.99,
        sku: "APP-003",
        status: "draft" as const,
        stock: 0,
        threshold: 10,
      },
    ];

    const createdProducts: {
      id: number;
      name: string;
      price: string | number;
    }[] = [];
    for (const p of demoProducts) {
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-demo";
      const product = await createProduct({
        name: p.name,
        slug,
        price: String(p.price),
        sku: p.sku,
        status: p.status,
        tenantId,
        trackInventory: true,
      });
      if (product) {
        await upsertInventory(tenantId, product.id, p.stock, p.threshold);
        createdProducts.push(product);
      }
    }

    // Create demo customers
    const demoCustomers = [
      {
        email: "alice@example.com",
        firstName: "Alice",
        lastName: "Johnson",
        phone: "+1-555-0101",
      },
      {
        email: "bob@example.com",
        firstName: "Bob",
        lastName: "Martinez",
        phone: "+1-555-0102",
      },
      {
        email: "carol@example.com",
        firstName: "Carol",
        lastName: "Chen",
        phone: "+1-555-0103",
      },
    ];
    for (const c of demoCustomers) {
      await upsertCustomer(tenantId, c.email, {
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
      });
    }

    // Create demo orders
    if (createdProducts.length >= 2) {
      const p1 = createdProducts[0];
      const p2 = createdProducts[1];
      const ts = Date.now();
      await createOrder(
        {
          tenantId,
          orderNumber: `DEMO-${ts}-1`,
          customerEmail: "alice@example.com",
          customerName: "Alice Johnson",
          status: "delivered" as const,
          paymentStatus: "paid",
          subtotal: String(Number(p1.price) * 2),
          total: String(Number(p1.price) * 2),
          currency: "USD",
          notes: "Demo order",
        },
        [
          {
            productId: p1.id,
            productName: p1.name,
            quantity: 2,
            unitPrice: Number(p1.price),
          },
        ]
      );
      await createOrder(
        {
          tenantId,
          orderNumber: `DEMO-${ts}-2`,
          customerEmail: "bob@example.com",
          customerName: "Bob Martinez",
          status: "processing",
          paymentStatus: "paid",
          subtotal: String(Number(p2.price)),
          total: String(Number(p2.price)),
          currency: "USD",
        },
        [
          {
            productId: p2.id,
            productName: p2.name,
            quantity: 1,
            unitPrice: Number(p2.price),
          },
        ]
      );
      await createOrder(
        {
          tenantId,
          orderNumber: `DEMO-${ts}-3`,
          customerEmail: "carol@example.com",
          customerName: "Carol Chen",
          status: "pending",
          paymentStatus: "pending",
          subtotal: String(Number(p1.price)),
          total: String(Number(p1.price)),
          currency: "USD",
        },
        [
          {
            productId: p1.id,
            productName: p1.name,
            quantity: 1,
            unitPrice: Number(p1.price),
          },
        ]
      );
    }

    return {
      success: true,
      productsCreated: createdProducts.length,
      customersCreated: demoCustomers.length,
      ordersCreated: 3,
    };
  }),
});
