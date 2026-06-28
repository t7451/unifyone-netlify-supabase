/**
 * server/payments/square/index.ts
 *
 * Barrel for the layered Square integration. Re-exports every symbol that
 * server/square.ts historically exported, so existing import paths
 * (via the server/square.ts shim) keep resolving unchanged.
 *
 * Layers:
 *   client.ts   — Square SDK init + configuration predicate
 *   repo.ts     — DB access (auth, tenant resolution, webhook persistence)
 *   sync.ts     — business logic (checkout, order/subscription sync)
 *   webhooks.ts — transport (HMAC verification, Express + Fetch adapters)
 */
export { squareConfigured } from "./client";
export { resolveTenantForSquare, recordSquareWebhookEvent } from "./repo";
export {
  createSquareCheckout,
  applySquareEvent,
  type CreateSquareCheckoutInput,
} from "./sync";
export {
  expectedSquareSignature,
  verifySquareSignature,
  registerSquareRoutes,
  registerSquareFetchRoutes,
} from "./webhooks";

import { squareConfigured } from "./client";
import { resolveTenantForSquare, recordSquareWebhookEvent } from "./repo";
import { applySquareEvent } from "./sync";
import { expectedSquareSignature, verifySquareSignature } from "./webhooks";

// Export internals for tests.
export const __internal__ = {
  expectedSquareSignature,
  verifySquareSignature,
  resolveTenantForSquare,
  applySquareEvent,
  recordSquareWebhookEvent,
  squareConfigured,
};
