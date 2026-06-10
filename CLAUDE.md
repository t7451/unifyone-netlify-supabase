# UnifyOne — Claude Code Instructions

## Project Overview

**UnifyOne** is a full-stack multi-tenant e-commerce SaaS platform built with React, TypeScript, Express, and tRPC. It includes:

- Multi-tenant commerce with Stripe, PayPal, Shopify, and Square payment integrations
- Subscription billing, analytics, team collaboration, and affiliate management
- AI-powered automation (Anthropic Claude SDK, Model Context Protocol)
- Gamification, social commerce, money manager, and governance systems

**Tech Stack:**

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Radix UI / shadcn/ui
- **Backend:** Express.js, tRPC 11, Node.js 22+
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** JWT (cookie-based) with role-based access control
- **Testing:** Vitest
- **Package Manager:** pnpm 10

### Persistence stack (read carefully -- NOT a single source of truth)

UnifyOne deliberately writes to **two** Postgres clusters depending on the
feature (hybrid architecture, current as of June 2026 — see
`docs/DATABASE_ARCHITECTURE.md`):

| Feature                              | Backed by         | Code                           |
| ------------------------------------ | ----------------- | ------------------------------ |
| Auth (signup/signin)                 | Neon via Drizzle  | server/\_core/customAuth.ts    |
| Tenants/products/orders              | Neon via Drizzle  | server/routers/\*, drizzle/    |
| Credit metering                      | Supabase RPC      | server/creditMeter.ts          |
| Credit top-up billing                | Supabase          | server/billing.ts              |
| Stripe subscriptions/products/prices | Supabase          | server/stripe.ts               |
| Shared Supabase admin client         | Supabase          | server/\_core/supabaseAdmin.ts |
| Real-time push (optional)            | Supabase Realtime | client/src/lib/supabase\*.ts   |

**Neon** (`DATABASE_URL`) is the primary database (~77 tables, source of
truth for most of the app). **Supabase** is the kept-on-purpose specialized
layer: credit balances/usage/overage queue, Stripe object storage, and the
atomic `consume_credits_with_meter()` RPC. The earlier full-removal plan in
`SUPABASE_REMOVAL.md` is superseded — do NOT sweep the Supabase code or env
vars as dead, they are load-bearing.

Required Supabase env vars: `SUPABASE_URL`, `VITE_SUPABASE_URL`, plus keys in
the new format (`SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`,
`VITE_SUPABASE_PUBLISHABLE_KEY`) — the legacy names
(`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY`,
`SUPABASE_JWT_SECRET`) are still accepted as fallbacks.

Supabase is also NOT the primary auth provider (custom JWT on Neon is), but
its OAuth endpoints stay active in parallel for external OAuth flows — see
`docs/OAUTH.md`.

---

## Build & Test Commands

```bash
# Development (hot reload)
pnpm dev

# Production build
pnpm build        # Vite frontend + esbuild server bundle
pnpm start        # Run production build

# Type checking
pnpm check        # tsc --noEmit

# Linting & formatting
pnpm lint         # ESLint on .ts/.tsx files
pnpm lint:fix     # ESLint with --fix (max-warnings 20)
pnpm format       # Prettier write all files

# Tests
pnpm test         # Vitest (server/**/*.test.ts, server/**/*.spec.ts)

# Database
pnpm db:push      # drizzle-kit generate && migrate
```

---

## Architecture

### Folder Structure

```
client/           # React/Vite frontend
  src/
    _core/        # Internal hooks and context setup
    components/   # 70+ UI components (shadcn/ui + custom)
    pages/        # 57+ page routes
    contexts/     # React context providers
    hooks/        # Custom React hooks
    lib/          # Utility functions

server/           # Express + tRPC backend
  _core/          # Server entry, tRPC setup, context, OAuth
  routers/        # 30+ tRPC routers
  lib/            # Auth, DB helpers
  *.ts            # Service modules (stripe, paypal, shopify, etc.)

shared/           # Shared types, errors, constants (client + server)
drizzle/          # Schema, relations, SQL migrations
scripts/          # Seed data and deployment helpers
```

### Key Patterns

- **tRPC**: All client–server communication is type-safe via tRPC (no REST endpoints)
- **Multi-tenancy**: All DB tables include `tenantId`; tenant isolation enforced via JWT claims
- **Drizzle ORM**: Schema-first with typed migrations; 22 migration files; schema in `drizzle/schema.ts`
- **Routing**: Wouter (lightweight) for frontend; 57+ page components
- **Path aliases**: `@/*` → `client/src/*`, `@shared/*` → `shared/*`
- **Webhooks**: Stripe, Shopify, n8n — always verify signatures before processing
- **Deployment**: Docker (Node 22 Alpine multi-stage), Netlify for frontend, GitHub Actions CI/CD

---

## Coding Conventions

### TypeScript

- Strict mode is **on** — avoid `any` (lint warning), avoid non-null assertions (lint warning)
- Use `const` over `let`; never use `var`
- Unused variables are an **error** — prefix intentionally unused vars with `_`
- Module resolution: `bundler` mode; use path aliases (`@/`, `@shared/`)

### ESLint (flat config)

- `react-hooks/rules-of-hooks` is enforced — always follow rules of hooks
- `react-refresh/only-export-components` — only export components from page/component files
- Max 20 lint warnings allowed in pre-commit; keep warnings minimal

### Prettier

- Double quotes, semicolons, 2-space indent
- Print width: 80, trailing comma: `es5`, arrow parens: omit when single arg
- End of line: LF

### UI / Styling

- Use **shadcn/ui** components (Radix UI + Tailwind CSS); config in `components.json`
- Tailwind CSS 4 with CSS variables for theming (base color: neutral)
- Class merging via `cn()` utility from `@/lib/utils`
- New York variant for shadcn components

### Testing

- Tests live alongside source in `server/` (`.test.ts` / `.spec.ts`)
- Test utilities in `server/__tests__/`
- Run `pnpm test` before pushing new server-side logic

---

## Environment & Config

- Copy `.env.example` to `.env` for local development
- Database URL set via `DATABASE_URL` (PostgreSQL)
- Stripe, PayPal, Square, Shopify, Supabase, AWS S3 keys are all required for full functionality
- JWT secret set via `JWT_SECRET`

---

## Important Notes

- **Do not break multi-tenancy** — every query that touches tenant data must filter by `tenantId`
- **Drizzle schema is the source of truth** — update `drizzle/schema.ts` first, then run `pnpm db:push`
- **Webhook handlers must verify signatures** — never skip verification (Stripe, Shopify, n8n)
- **Pre-commit hooks run lint-staged** — fix lint errors before committing
- **pnpm only** — do not use npm or yarn in this project
