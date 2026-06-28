/**
 * Public barrel for the Stripe payments layer.
 *
 * Re-exports every symbol previously exported by server/stripe.ts with
 * identical names and signatures:
 *   - `stripe`                     (the shared SDK singleton, may be null)
 *   - `registerStripeRoutes`       (Express route registration)
 *   - `registerStripeFetchRoutes`  (Netlify Fetch-handler routing)
 *
 * Callers continue to import from the original `server/stripe` path, which
 * is now a thin shim re-exporting this barrel.
 */
export { stripe } from "./client";
export { registerStripeRoutes, registerStripeFetchRoutes } from "./webhooks";
