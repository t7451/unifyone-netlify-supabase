/**
 * server/paymentFallback.ts
 *
 * Thin compatibility shim. The implementation now lives in
 * server/payments/fallback.ts; this re-export preserves existing import paths.
 */
export * from "./payments/fallback";
