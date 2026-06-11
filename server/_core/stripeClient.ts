/**
 * Shared Stripe client singleton.
 *
 * Centralises API version and key handling so every module uses the same
 * Stripe instance. Import `getStripe()` wherever a Stripe client is needed;
 * it returns `null` when STRIPE_SECRET_KEY is not set so callers can degrade
 * gracefully.
 */
import Stripe from "stripe";

/**
 * Canonical Stripe API version used across the entire application.
 *
 * MUST match the version shipped by the installed `stripe` SDK
 * (Stripe.LatestApiVersion). Pinning a version Stripe doesn't recognize
 * makes the API reject EVERY request, which surfaces as "payment link
 * returning errors" across all checkout/subscription flows.
 */
export const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2026-02-25.clover";

let _stripe: Stripe | null = null;

/**
 * Returns the shared Stripe singleton, or `null` when the secret key is absent.
 * Safe to call in module scope — the instance is created lazily on first call.
 */
export function getStripe(): Stripe | null {
  if (_stripe) return _stripe;
  if (!process.env.STRIPE_SECRET_KEY) return null;
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
  });
  return _stripe;
}
