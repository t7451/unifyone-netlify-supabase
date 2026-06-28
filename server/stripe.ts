/**
 * Thin compatibility shim.
 *
 * The Stripe service was split into a layered folder at
 * server/payments/stripe/ (client / repo / sync / webhooks / index). This
 * module re-exports the public barrel so existing callers importing from
 * "../stripe" / "./stripe" keep resolving to the same symbols with identical
 * names and signatures (`stripe`, `registerStripeRoutes`,
 * `registerStripeFetchRoutes`).
 */
export * from "./payments/stripe";
