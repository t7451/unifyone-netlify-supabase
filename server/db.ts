// `server/db.ts` is now a thin barrel that re-exports the split domain modules
// under `server/db/`. The implementation moved into per-domain files
// (connection, users, tenants, plans, products, inventory, categories, orders,
// customers, analytics, surveys, dashboard, webhooks, apiKeys, gigWorker,
// clipping); this file exists solely so existing import specifiers keep
// resolving unchanged.
//
// Both forms must keep working:
//   - extensionless `import { ... } from "../db"`  → resolves here / db/index
//   - explicit-extension `import("../../server/db.js")` (e.g. the Netlify
//     `mcp.mts` function) → resolves to this file. A bare `db/` directory does
//     NOT satisfy a `db.js` specifier under bundler/esbuild resolution, so this
//     file is load-bearing for that caller.
export * from "./db/index";
