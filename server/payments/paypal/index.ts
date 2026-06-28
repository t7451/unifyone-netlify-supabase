/**
 * server/payments/paypal/index.ts
 *
 * Barrel that re-exports every symbol previously exported from
 * server/paypal.ts with identical names and signatures, so existing callers
 * (which import from "../paypal") see no change.
 *
 * Layering:
 *   client.ts   — PayPal REST HTTP init (base URL, access token, config gate)
 *   webhooks.ts — transport: signature verification + Express/Fetch routes
 *   sync.ts     — business: order create/capture + webhook → state sync
 *   repo.ts     — DB access wrapping ../../db helpers
 */
import { parseCustomId, applyPayPalEvent } from "./sync";
import { recordPayPalWebhookEvent, resolveTenantForPayPal } from "./repo";
import { paypalConfigured } from "./client";

export { getPayPalAccessToken } from "./client";

export type { CreatePayPalOrderInput, PayPalCaptureResult } from "./sync";
export {
  createPayPalOrder,
  capturePayPalOrder,
  parseCustomId,
  applyPayPalEvent,
} from "./sync";
export { resolveTenantForPayPal } from "./repo";

export {
  verifyPayPalWebhookSignature,
  registerPayPalRoutes,
  registerPayPalFetchRoutes,
} from "./webhooks";

// Export key internals for tests.
export const __internal__ = {
  parseCustomId,
  applyPayPalEvent,
  recordPayPalWebhookEvent,
  resolveTenantForPayPal,
  paypalConfigured,
};
