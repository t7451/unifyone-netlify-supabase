// Barrel for the split `server/db` domain modules.
//
// This replaces the former single-file `server/db.ts` god object. Every symbol
// that was exported from that file is re-exported here unchanged, so existing
// `import { ... } from "../db"` (and `vi.mock("../db")`) call sites keep working
// without modification.

export { getDb } from "./connection";
export * from "./users";
export * from "./tenants";
export * from "./plans";
export * from "./products";
export * from "./inventory";
export * from "./categories";
export * from "./orders";
export * from "./customers";
export * from "./analytics";
export * from "./surveys";
export * from "./dashboard";
export * from "./webhooks";
export * from "./apiKeys";
export * from "./gigWorker";
export * from "./clipping";
