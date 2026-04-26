/**
 * Verifies that a purchase recorded in the UnifyOne database is actually
 * backed by a real, paid Stripe object. Used by `orders.create` (and any
 * other purchase-recording entry point) to refuse orders that don't
 * correspond to a real Stripe API call.
 *
 * For non-Stripe providers (PayPal, Square, Shopify) we only require a
 * provider reference id be supplied — those flows have their own
 * capture/webhook verification paths.
 */
import type Stripe from "stripe";
import { getStripe } from "./stripeClient";

export type StripeVerificationFailure =
  | "stripe_unavailable"
  | "not_found"
  | "not_paid"
  | "amount_mismatch"
  | "currency_mismatch";

export class StripeVerificationError extends Error {
  constructor(
    public readonly reason: StripeVerificationFailure,
    message: string
  ) {
    super(message);
    this.name = "StripeVerificationError";
  }
}

/**
 * The order total (decimal string or number, e.g. "12.34" / 12.34) compared
 * against a Stripe amount (integer minor units, e.g. 1234). Returns true when
 * they match within a 1-cent rounding tolerance.
 */
export function amountsMatch(
  orderTotal: string | number,
  stripeAmountMinor: number
): boolean {
  const total =
    typeof orderTotal === "string" ? Number(orderTotal) : orderTotal;
  if (!Number.isFinite(total)) return false;
  const orderMinor = Math.round(total * 100);
  return Math.abs(orderMinor - stripeAmountMinor) <= 1;
}

interface ExpectedPayment {
  amount: string | number;
  currency: string;
}

/**
 * Confirms a Stripe PaymentIntent exists, is paid, and matches the order's
 * amount and currency. Throws StripeVerificationError on any mismatch.
 */
export async function verifyStripePaymentIntent(
  paymentIntentId: string,
  expected: ExpectedPayment,
  client: Pick<Stripe, "paymentIntents"> | null = getStripe()
): Promise<Stripe.PaymentIntent> {
  if (!client) {
    throw new StripeVerificationError(
      "stripe_unavailable",
      "Stripe is not configured on this server."
    );
  }
  let intent: Stripe.PaymentIntent;
  try {
    intent = await client.paymentIntents.retrieve(paymentIntentId);
  } catch {
    throw new StripeVerificationError(
      "not_found",
      `Stripe PaymentIntent ${paymentIntentId} could not be retrieved.`
    );
  }
  if (intent.status !== "succeeded") {
    throw new StripeVerificationError(
      "not_paid",
      `Stripe PaymentIntent ${paymentIntentId} is in status "${intent.status}", not "succeeded".`
    );
  }
  if (!amountsMatch(expected.amount, intent.amount_received ?? intent.amount)) {
    throw new StripeVerificationError(
      "amount_mismatch",
      `Stripe PaymentIntent amount (${intent.amount_received ?? intent.amount}) does not match order total.`
    );
  }
  if (intent.currency.toLowerCase() !== expected.currency.toLowerCase()) {
    throw new StripeVerificationError(
      "currency_mismatch",
      `Stripe PaymentIntent currency (${intent.currency}) does not match order currency (${expected.currency}).`
    );
  }
  return intent;
}

/**
 * Confirms a Stripe Checkout Session exists, was paid, and matches the
 * order's amount and currency. Throws StripeVerificationError on mismatch.
 */
export async function verifyStripeCheckoutSession(
  sessionId: string,
  expected: ExpectedPayment,
  client: Pick<Stripe, "checkout"> | null = getStripe()
): Promise<Stripe.Checkout.Session> {
  if (!client) {
    throw new StripeVerificationError(
      "stripe_unavailable",
      "Stripe is not configured on this server."
    );
  }
  let session: Stripe.Checkout.Session;
  try {
    session = await client.checkout.sessions.retrieve(sessionId);
  } catch {
    throw new StripeVerificationError(
      "not_found",
      `Stripe Checkout Session ${sessionId} could not be retrieved.`
    );
  }
  if (session.payment_status !== "paid") {
    throw new StripeVerificationError(
      "not_paid",
      `Stripe Checkout Session ${sessionId} payment_status is "${session.payment_status}", not "paid".`
    );
  }
  const amountTotal = session.amount_total;
  if (amountTotal == null || !amountsMatch(expected.amount, amountTotal)) {
    throw new StripeVerificationError(
      "amount_mismatch",
      `Stripe Checkout Session amount (${amountTotal}) does not match order total.`
    );
  }
  const sessionCurrency = session.currency;
  if (
    !sessionCurrency ||
    sessionCurrency.toLowerCase() !== expected.currency.toLowerCase()
  ) {
    throw new StripeVerificationError(
      "currency_mismatch",
      `Stripe Checkout Session currency (${sessionCurrency}) does not match order currency (${expected.currency}).`
    );
  }
  return session;
}
