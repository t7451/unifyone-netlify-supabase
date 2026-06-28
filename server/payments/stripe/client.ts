/**
 * Stripe client accessor for the payments/stripe layer.
 *
 * Thin re-export of the shared singleton in server/_core/stripeClient. The
 * layered modules (webhooks/sync/repo) import `stripe` from here so the SDK
 * init point is a single, swappable seam. Behavior is identical to the
 * previous `const stripe = getStripe()` at the top of server/stripe.ts.
 */
import { getStripe } from "../../_core/stripeClient";

export const stripe = getStripe();
