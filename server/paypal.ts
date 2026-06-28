/**
 * server/paypal.ts
 *
 * PayPal Smart Buttons + REST checkout integration.
 *
 * This module has been split into a layered folder, server/payments/paypal/:
 *   client.ts   — PayPal REST HTTP init (base URL, access token, config gate)
 *   webhooks.ts — transport: signature verification + Express/Fetch routes
 *   sync.ts     — business: order create/capture + webhook → state sync
 *   repo.ts     — DB access wrapping ../db helpers
 *   index.ts    — barrel re-exporting the original public surface
 *
 * This file is kept as a thin re-export so existing callers (which import
 * from "../paypal") continue to work unchanged.
 */
export * from "./payments/paypal";
