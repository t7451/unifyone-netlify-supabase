import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { getStripe } from "../../_core/stripeClient";
import {
  buildKaiCreditCheckoutMetadata,
  normalizeKaiCreditCheckoutOrigin,
  selectKaiCreditPackage,
} from "../../lib/kaiCredits";
import { isMasterControlUser } from "../../lib/masterControl";
import { MASTER_CONTROL_KAI_BALANCE } from "../../lib/kaiCreditGuard";
import type { User } from "../../../drizzle/schema";
import * as repo from "./kaiCredits.repo";

export { listActivePackages } from "./kaiCredits.repo";

type KaiUser = User;

export async function getKaiBalance(
  user: KaiUser | null,
  tenantId: number,
  transactionLimit: number
) {
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

  const db = await repo.getDbOrNull();
  if (!db) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Database is unavailable",
    });
  }

  const balance = await repo.getBalance(db, tenantId, userId);

  const transactions = await repo.listLedgerTransactions(
    db,
    tenantId,
    userId,
    transactionLimit
  );

  return {
    purchased: Number(balance?.purchased ?? 0),
    used: Number(balance?.used ?? 0),
    remaining: Number(balance?.remaining ?? 0),
    transactions,
  };
}

export async function listPurchaseHistory(
  user: KaiUser | null,
  tenantId: number,
  limit: number
) {
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
  const userId = user.id;
  const purchases = await repo.listPurchases(tenantId, userId, limit);
  if (purchases === null) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Database is unavailable",
    });
  }

  return { purchases };
}

export async function createKaiCreditCheckout(
  user: KaiUser | null,
  tenantId: number,
  input: { packageSlug?: string; packageId?: number; origin: string }
) {
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

  const db = await repo.getDbOrNull();
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
  const availablePackages = await repo.listActivePackages();
  const selectedPackage = selectKaiCreditPackage(availablePackages, input);

  if (!selectedPackage) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Kai credit package not found",
    });
  }

  const idempotencyKey = `kai_${randomUUID()}`;
  const purchase = await repo.insertPurchase(db, {
    tenantId,
    userId,
    packageId: selectedPackage.id,
    packageSlug: selectedPackage.slug,
    credits: selectedPackage.credits,
    amountCents: selectedPackage.amountCents,
    currency: selectedPackage.currency,
    idempotencyKey,
    packageSnapshot: selectedPackage,
  });

  try {
    const metadata = buildKaiCreditCheckoutMetadata({
      userId,
      tenantId,
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

    await repo.markPurchaseCheckoutSession(
      db,
      purchase.id,
      tenantId,
      userId,
      session.id
    );

    return {
      url: session.url,
      purchaseId: purchase.id,
      package: selectedPackage,
    };
  } catch (error) {
    await repo.markPurchaseFailed(db, purchase.id, tenantId, userId);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message:
        error instanceof Error
          ? error.message
          : "Unable to create Stripe checkout session",
    });
  }
}
