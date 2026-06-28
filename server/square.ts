/**
 * server/square.ts
 *
 * Thin compatibility shim. The Square integration now lives, layered, under
 * server/payments/square/ (client/repo/sync/webhooks + index barrel); this
 * re-export preserves every existing import path and public symbol.
 */
export * from "./payments/square";
