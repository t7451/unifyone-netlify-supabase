# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install
pnpm dev          # tsx watch server/_core/index.ts + Vite middleware, auto-picks port from 3000
pnpm build        # vite build (client → dist/) + esbuild (server → dist/index.js)
pnpm start        # production
pnpm test         # vitest (server/**/*.test.ts)
pnpm test -- --reporter=verbose   # single test file: pnpm test -- server/routers/products.test.ts
pnpm check        # tsc --noEmit
pnpm db:push      # drizzle-kit generate && drizzle-kit migrate
```

Required env: `DATABASE_URL` (MySQL/TiDB), plus Stripe, PayPal, Shopify, Resend, AWS S3, and Manus OAuth secrets (see `server/_core/env.ts` for full list).

## Architecture

**Multi-tenant SaaS** (PNW Enterprises / 1Commerce) deployed to Netlify. All `/api/*` traffic routes through `netlify/functions/server.ts` (serverless-http wrapping Express). Vite serves the React SPA statically.

### Request lifecycle

```
Browser → Netlify CDN
  → static: dist/           (React SPA via Vite build)
  → /api/*: Netlify Function → Express (server/_core/index.ts)
      Stripe/PayPal/Shopify webhook routes (raw body, registered FIRST)
      → /api/trpc/* via createExpressMiddleware
          → tRPC context (Manus OAuth cookie → user + tenantId)
          → appRouter (server/routers.ts, 27+ feature routers)
```

### Key files

| File | Role |
|---|---|
| `server/_core/index.ts` | Express app setup, middleware order, port binding |
| `server/_core/trpc.ts` | `t.router`, `publicProcedure`, `protectedProcedure`, `adminProcedure` |
| `server/_core/context.ts` | Builds `ctx` from request — calls `sdk.authenticateRequest()` |
| `server/routers.ts` | Assembles `appRouter` from all feature routers |
| `server/db.ts` | **Only** place raw Drizzle queries live — routers import helpers from here |
| `drizzle/schema.ts` | All 35+ MySQL table definitions |
| `server/stripe.ts` / `paypal.ts` / `shopify.ts` | Third-party webhook/sync logic |
| `client/src/main.tsx` | tRPC client + React Query provider setup |
| `client/src/App.tsx` | Wouter SPA routes, `ProtectedRoute`, `TenantGuard` |

### Data model

All tenant-scoped tables carry `tenantId`. Core tables: `users`, `tenants`, `plans`, `products`, `categories`, `inventory`, `customers`, `orders`, `orderItems`. Additional tables cover gamification, affiliates, themes, automations, social, and analytics.

### Auth

Auth is Manus OAuth. `ctx.user` is populated in `server/_core/context.ts`. Unauthenticated requests return null user. Client checks `trpc.auth.me` and redirects to the Manus login URL on 401. `adminProcedure` enforces `ctx.user.role === 'admin'`.

### Frontend

- Router: Wouter (not React Router, not Next.js)
- State: tRPC + React Query (no Redux/Zustand)
- UI: shadcn/ui + Tailwind CSS 4
- `TenantGuard` redirects to `/setup` when `ctx.user.tenantId` is null

## Coding rules (from `.github/copilot-instructions.md`)

- **No raw SQL in routers** — add query helpers to `server/db.ts`, import them
- **Always scope queries by `tenantId`** taken from `ctx.user.tenantId`
- **Always validate tRPC inputs with Zod**
- **Never store file bytes in the DB** — use S3 presigned URLs
- **New tRPC procedures need a Vitest test** in the corresponding `*.test.ts` file
- **Cathedral Principle**: automate before scaling; prefer event-driven patterns; add kill switches for any mutation that fires external calls

## Adding a feature

1. Add table(s) to `drizzle/schema.ts`, run `pnpm db:push`
2. Add query helpers to `server/db.ts`
3. Create or extend a router under `server/routers/`, register it in `server/routers.ts`
4. Add pages/components under `client/src/pages/` and wire a route in `client/src/App.tsx`
5. Write tests in `server/routers/<feature>.test.ts`
