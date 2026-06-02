import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getStripe } from "../_core/stripeClient";
import { protectedProcedure, router, tenantProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  buildKaiCreditCheckoutMetadata,
  DEFAULT_KAI_CREDIT_PACKAGES,
  normalizeKaiCreditCheckoutOrigin,
  selectKaiCreditPackage,
  type KaiCreditPackageDto,
} from "../lib/kaiCredits";
import {
  kaiCreditLedger,
  kaiCreditPackages,
  kaiCreditPurchases,
  type KaiCreditPackage,
} from "../../drizzle/schema";
import { isMasterControlUser } from "../lib/masterControl";
import { MASTER_CONTROL_KAI_BALANCE } from "../lib/kaiCreditGuard";

function toPackageDto(pkg: KaiCreditPackage): KaiCreditPackageDto {
  return {
    id: pkg.id,
    slug: pkg.slug,
    name: pkg.name,
    description: pkg.description ?? "",
    credits: pkg.credits,
    amountCents: pkg.amountCents,
    amountUsd: pkg.amountCents / 100,
    currency: pkg.currency,
    stripePriceId: pkg.stripePriceId,
    isDefault: false,
  };
}

async function listActivePackages(): Promise<KaiCreditPackageDto[]> {
  const db = await getDb();
  if (!db) return DEFAULT_KAI_CREDIT_PACKAGES;

  const packages = await db
    .select()
    .from(kaiCreditPackages)
    .where(eq(kaiCreditPackages.isActive, true))
    .orderBy(asc(kaiCreditPackages.sortOrder), asc(kaiCreditPackages.id));

  return packages.length
    ? packages.map(toPackageDto)
    : DEFAULT_KAI_CREDIT_PACKAGES;
}

export const kaiCreditsRouter = router({
  listPackages: protectedProcedure.query(async () => {
    const packages = await listActivePackages();
    return { packages };
  }),

  getBalance: tenantProcedure
    .input(
      z.object({ transactionLimit: z.number().min(1).max(100).default(20) })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const userId = user.id;

      // master_control is exempt from metering — report an unlimited balance
      // and no transactions, without touching the ledger.
      if (isMasterControlUser(user)) {
        return {
          purchased: MASTER_CONTROL_KAI_BALANCE,
          used: 0,
          remaining: MASTER_CONTROL_KAI_BALANCE,
          transactions: [],
        };
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Database is unavailable",
        });
      }

      const [balance] = await db
        .select({
          purchased: sql<number>`coalesce(sum(case when ${kaiCreditLedger.type} = 'purchase' then ${kaiCreditLedger.creditDelta} else 0 end), 0)::int`,
          used: sql<number>`abs(coalesce(sum(case when ${kaiCreditLedger.type} = 'usage' then ${kaiCreditLedger.creditDelta} else 0 end), 0))::int`,
          remaining: sql<number>`coalesce(sum(${kaiCreditLedger.creditDelta}), 0)::int`,
        })
        .from(kaiCreditLedger)
        .where(
          and(
            eq(kaiCreditLedger.tenantId, ctx.tenantId),
            eq(kaiCreditLedger.userId, userId)
          )
        );

      const transactions = await db
        .select({
          id: kaiCreditLedger.id,
          type: kaiCreditLedger.type,
          creditDelta: kaiCreditLedger.creditDelta,
          description: kaiCreditLedger.description,
          purchaseId: kaiCreditLedger.purchaseId,
          createdAt: kaiCreditLedger.createdAt,
        })
        .from(kaiCreditLedger)
        .where(
          and(
            eq(kaiCreditLedger.tenantId, ctx.tenantId),
            eq(kaiCreditLedger.userId, userId)
          )
        )
        .orderBy(desc(kaiCreditLedger.createdAt), desc(kaiCreditLedger.id))
        .limit(input.transactionLimit);

      return {
        purchased: Number(balance?.purchased ?? 0),
        used: Number(balance?.used ?? 0),
        remaining: Number(balance?.remaining ?? 0),
        transactions,
      };
    }),

  listHistory: tenantProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(25) }))
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const userId = user.id;
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Database is unavailable",
        });
      }

      const purchases = await db
        .select({
          id: kaiCreditPurchases.id,
          packageSlug: kaiCreditPurchases.packageSlug,
          credits: kaiCreditPurchases.credits,
          amountCents: kaiCreditPurchases.amountCents,
          currency: kaiCreditPurchases.currency,
          status: kaiCreditPurchases.status,
          stripeCheckoutSessionId: kaiCreditPurchases.stripeCheckoutSessionId,
          paidAt: kaiCreditPurchases.paidAt,
          fulfilledAt: kaiCreditPurchases.fulfilledAt,
          createdAt: kaiCreditPurchases.createdAt,
        })
        .from(kaiCreditPurchases)
        .where(
          and(
            eq(kaiCreditPurchases.tenantId, ctx.tenantId),
            eq(kaiCreditPurchases.userId, userId)
          )
        )
        .orderBy(
          desc(kaiCreditPurchases.createdAt),
          desc(kaiCreditPurchases.id)
        )
        .limit(input.limit);

      return { purchases };
    }),

  createCheckout: tenantProcedure
    .input(
      z
        .object({
          packageSlug: z.string().min(1).max(64).optional(),
          packageId: z.number().int().positive().optional(),
          origin: z.string().min(1),
        })
        .refine(input => input.packageSlug || input.packageId, {
          message: "packageSlug or packageId is required",
        })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const userId = user.id;
      const userEmail = user.email;
      const stripe = getStripe();
      if (!stripe) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Stripe is not configured",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Database is unavailable",
        });
      }

      let baseUrl: string;
      try {
        baseUrl = normalizeKaiCreditCheckoutOrigin(input.origin);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Invalid checkout origin",
        });
      }
      const availablePackages = await listActivePackages();
      const selectedPackage = selectKaiCreditPackage(availablePackages, input);

      if (!selectedPackage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Kai credit package not found",
        });
      }

      const idempotencyKey = `kai_${randomUUID()}`;
      const [purchase] = await db
        .insert(kaiCreditPurchases)
        .values({
          tenantId: ctx.tenantId,
          userId,
          packageId: selectedPackage.id,
          packageSlug: selectedPackage.slug,
          credits: selectedPackage.credits,
          amountCents: selectedPackage.amountCents,
          currency: selectedPackage.currency,
          idempotencyKey,
          packageSnapshot: selectedPackage,
        })
        .returning();

      try {
        const metadata = buildKaiCreditCheckoutMetadata({
          userId,
          tenantId: ctx.tenantId,
          packageSlug: selectedPackage.slug,
          credits: selectedPackage.credits,
          purchaseId: purchase.id,
          idempotencyKey,
        });

        const session = await stripe.checkout.sessions.create(
          {
            mode: "payment",
            payment_method_types: ["card"],
            customer_email: userEmail ?? undefined,
            client_reference_id: String(userId),
            line_items: [
              selectedPackage.stripePriceId
                ? { price: selectedPackage.stripePriceId, quantity: 1 }
                : {
                    price_data: {
                      currency: selectedPackage.currency.toLowerCase(),
                      unit_amount: selectedPackage.amountCents,
                      product_data: {
                        name: `Kai Credits: ${selectedPackage.name}`,
                        description: `${selectedPackage.credits} Kai credits`,
                        metadata,
                      },
                    },
                    quantity: 1,
                  },
            ],
            metadata,
            payment_intent_data: { metadata },
            success_url: `${baseUrl}/dashboard?kaiCredits=success&purchaseId=${purchase.id}`,
            cancel_url: `${baseUrl}/dashboard?kaiCredits=cancelled&purchaseId=${purchase.id}`,
          },
          { idempotencyKey: `kai-credit-checkout-${purchase.id}` }
        );

        if (!session.url) {
          throw new TRPCError({
            code: "BAD_GATEWAY",
            message: "Stripe did not return a checkout URL",
          });
        }

        await db
          .update(kaiCreditPurchases)
          .set({
            stripeCheckoutSessionId: session.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(kaiCreditPurchases.id, purchase.id),
              eq(kaiCreditPurchases.tenantId, ctx.tenantId),
              eq(kaiCreditPurchases.userId, userId)
            )
          );

        return {
          url: session.url,
          purchaseId: purchase.id,
          package: selectedPackage,
        };
      } catch (error) {
        await db
          .update(kaiCreditPurchases)
          .set({ status: "failed", updatedAt: new Date() })
          .where(
            and(
              eq(kaiCreditPurchases.id, purchase.id),
              eq(kaiCreditPurchases.tenantId, ctx.tenantId),
              eq(kaiCreditPurchases.userId, userId)
            )
          );
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message:
            error instanceof Error
              ? error.message
              : "Unable to create Stripe checkout session",
        });
      }
    }),
});
