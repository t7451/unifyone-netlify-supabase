import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { plans, tenants, users, type InsertTenant } from "../../drizzle/schema";
import { getAllTenants, getDb, getPlans, getTenantById } from "../db";
import {
  isMasterControlUser,
  MASTER_CONTROL_ACCOUNT_ID,
  MASTER_CONTROL_USERNAME,
} from "../lib/masterControl";
import { protectedProcedure, router } from "../_core/trpc";

const tenantStatusSchema = z.enum([
  "active",
  "suspended",
  "trial",
  "cancelled",
]);

const subscriptionStatusSchema = z.enum([
  "active",
  "past_due",
  "cancelled",
  "trialing",
  "none",
]);

function requireMasterControl(ctx: { user: { openId: string } }) {
  if (!isMasterControlUser(ctx.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Master Control is restricted to the platform owner account.",
    });
  }
}

export const masterControlRouter = router({
  status: protectedProcedure.query(({ ctx }) => {
    const isMasterAccount = isMasterControlUser(ctx.user);

    return {
      isMasterAccount,
      canUseMasterControl: isMasterAccount,
      expectedOpenId: MASTER_CONTROL_ACCOUNT_ID,
      expectedUsername: MASTER_CONTROL_USERNAME,
      account: {
        id: ctx.user.id,
        openId: ctx.user.openId,
        username: ctx.user.username,
        email: ctx.user.email,
        name: ctx.user.name,
        role: ctx.user.role,
        tenantId: ctx.user.tenantId,
      },
      needsAdminClaim: isMasterAccount && ctx.user.role !== "admin",
      needsUsernameClaim:
        isMasterAccount && ctx.user.username !== MASTER_CONTROL_USERNAME,
    };
  }),

  claimOwnerAccess: protectedProcedure.mutation(async ({ ctx }) => {
    requireMasterControl(ctx);
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }

    const existingUsername = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, MASTER_CONTROL_USERNAME))
      .limit(1);

    const usernameAvailable =
      !existingUsername[0] || existingUsername[0].id === ctx.user.id;

    await db
      .update(users)
      .set({
        role: "admin",
        ...(usernameAvailable ? { username: MASTER_CONTROL_USERNAME } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.openId, MASTER_CONTROL_ACCOUNT_ID));

    return {
      success: true,
      role: "admin" as const,
      username: usernameAvailable ? MASTER_CONTROL_USERNAME : ctx.user.username,
      usernameClaimed: usernameAvailable,
    };
  }),

  snapshot: protectedProcedure.query(async ({ ctx }) => {
    requireMasterControl(ctx);
    const [tenantRows, planRows] = await Promise.all([
      getAllTenants(),
      getPlans(),
    ]);

    return {
      tenants: tenantRows.map(tenant => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        status: tenant.status,
        subscriptionStatus: tenant.subscriptionStatus,
        ownerId: tenant.ownerId,
        planId: tenant.planId,
        shopifyShopDomain: tenant.shopifyShopDomain,
        shopifySyncEnabled: tenant.shopifySyncEnabled,
        shopifyCheckoutUrl: tenant.shopifyCheckoutUrl,
        squareLocationId: tenant.squareLocationId,
        n8nWebhookUrl: tenant.n8nWebhookUrl,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      })),
      plans: planRows.map(plan => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        isActive: plan.isActive,
      })),
      modules: [
        { label: "Revenue Command", path: "/revenue-command" },
        { label: "DealFlow", path: "/dashboard/dealflow" },
        { label: "Leads", path: "/leads" },
        { label: "Revenue Streams", path: "/revenue-streams" },
        { label: "Affiliate Hub", path: "/affiliates" },
        { label: "Automations", path: "/automations" },
        { label: "Integrations", path: "/integrations" },
        { label: "Authorization Hub", path: "/auth-hub" },
        { label: "Developer Hub", path: "/developer" },
        { label: "Governance", path: "/governance" },
      ],
    };
  }),

  updateTenantControls: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        name: z.string().min(2).max(255).optional(),
        domain: z.string().trim().max(255).nullable().optional(),
        logoUrl: z.string().trim().max(1000).nullable().optional(),
        status: tenantStatusSchema.optional(),
        subscriptionStatus: subscriptionStatusSchema.optional(),
        planId: z.number().nullable().optional(),
        shopifyShopDomain: z.string().trim().max(255).nullable().optional(),
        shopifySyncEnabled: z.boolean().optional(),
        shopifyCheckoutUrl: z.string().trim().max(1000).nullable().optional(),
        squareLocationId: z.string().trim().max(100).nullable().optional(),
        n8nWebhookUrl: z.string().trim().max(1000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireMasterControl(ctx);
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      }

      const tenant = await getTenantById(input.tenantId);
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

      if (input.planId != null) {
        const [plan] = await db
          .select({ id: plans.id })
          .from(plans)
          .where(and(eq(plans.id, input.planId), eq(plans.isActive, true)))
          .limit(1);
        if (!plan) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Plan is not active or does not exist.",
          });
        }
      }

      const updates: Partial<InsertTenant> = { updatedAt: new Date() };
      for (const key of [
        "name",
        "domain",
        "logoUrl",
        "status",
        "subscriptionStatus",
        "planId",
        "shopifyShopDomain",
        "shopifySyncEnabled",
        "shopifyCheckoutUrl",
        "squareLocationId",
        "n8nWebhookUrl",
      ] as const) {
        if (input[key] !== undefined) {
          updates[key] = input[key] as never;
        }
      }

      await db
        .update(tenants)
        .set(updates)
        .where(eq(tenants.id, input.tenantId));
      return { success: true, tenant: await getTenantById(input.tenantId) };
    }),
});
