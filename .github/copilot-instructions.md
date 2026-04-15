# UnifyOne — GitHub Copilot Instructions

## Project Overview
UnifyOne is a full-stack multi-tenant SaaS e-commerce platform built for PNW Enterprises / 1Commerce LLC. It provides unified commerce operations integrating Stripe, PayPal, Square, Shopify payments, AI-powered automation (Anthropic Claude, MCP), subscription billing, analytics, team collaboration, affiliate management, gamification, social commerce, money manager, and governance systems.

**Tech Stack:**
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Radix UI / shadcn/ui, Wouter routing
- **Backend:** Express.js, tRPC 11, Node.js 22+
- **Database:** PostgreSQL via Drizzle ORM (Neon serverless)
- **Auth:** JWT (cookie-based) with role-based access control (OAuth + PKCE)
- **Testing:** Vitest
- **Package Manager:** pnpm 10 (required)
- **Deployment:** Docker (Node 22 Alpine), Netlify Functions (serverless-http), GitHub Actions CI/CD

## Build, Test, and Lint Commands

```bash
# Development
pnpm dev          # Hot reload server with tsx watch

# Production
pnpm build        # Vite frontend + esbuild server bundle
pnpm start        # Run production build

# Type checking
pnpm check        # tsc --noEmit (TypeScript strict mode)

# Linting & formatting
pnpm lint         # ESLint on .ts/.tsx files
pnpm lint:fix     # ESLint with --fix (max 20 warnings allowed)
pnpm format       # Prettier write all files

# Testing
pnpm test         # Run all tests (server/**/*.test.ts, server/**/*.spec.ts)
vitest run path/to/file.test.ts  # Run a single test file

# Database
pnpm db:generate  # Generate Drizzle migration files
pnpm db:push      # Generate & apply migrations to database
```

**Pre-commit hooks:** Husky + lint-staged runs `eslint --fix` (max 20 warnings) and `prettier --write` on staged files.

## High-Level Architecture

### Folder Structure
```
client/src/
  _core/          # Internal hooks, tRPC setup, theme context
  components/     # 70+ UI components (shadcn/ui + custom)
  pages/          # 57+ page routes (Wouter)
  contexts/       # React context providers (auth, tenant, realtime)
  hooks/          # Custom React hooks (useUser, useTenant, useRealtime)
  lib/            # Utilities (cn, formatters, validation helpers)

server/
  _core/          # Server entry (index.ts), tRPC setup, context, OAuth, errors
  routers/        # 30+ tRPC routers (tenant, products, orders, analytics, etc.)
  lib/            # Auth helpers, DB query utilities
  *.ts            # Service modules (stripe.ts, paypal.ts, shopify.ts, etc.)
  __tests__/      # Test utilities and fixtures

shared/           # Shared types, errors, constants (client + server)
drizzle/          # Database schema, relations, migrations (22+ migration files)
scripts/          # Seed data, deployment scripts
```

### tRPC Architecture
- **All** client–server communication is type-safe via tRPC (no REST endpoints except webhooks)
- **Router registry:** `server/routers.ts` merges 30+ feature routers into `appRouter`
- **Three procedure types:**
  - `publicProcedure` — no auth required (use sparingly, e.g., `auth.me`, webhooks)
  - `protectedProcedure` — requires authenticated user (`ctx.user` available)
  - `adminProcedure` — requires `ctx.user.role === 'admin'`
- **Input validation:** All inputs validated with Zod schemas in procedure definitions
- **Transformer:** SuperJSON for serializing Date, Map, Set across the wire
- **Client binding:** `client/src/lib/trpc.ts` exports typed `trpc` client

### Multi-Tenancy
- **Every** table with tenant-scoped data has a `tenantId` foreign key
- **Every** query that touches tenant data MUST filter by `ctx.user.tenantId`
- User's tenant determined from JWT (`ctx.user.tenantId`), set during OAuth flow
- Admin procedures (`adminProcedure`) enforce `ctx.user.role === 'admin'`
- Schema source of truth: `drizzle/schema.ts` (22+ PostgreSQL enums, 50+ tables)

### Database Patterns
- **Never** write raw SQL in routers — use or extend helpers in `server/db.ts`
- `server/db.ts` provides typed query helpers: `getUserByOpenId`, `upsertUser`, `getTenantById`, etc.
- All DB operations use Drizzle ORM with `drizzle-orm/neon-http` (serverless PostgreSQL)
- Database connection lazy-loaded via `getDb()` to prevent cold-start crashes in serverless
- Schema changes: update `drizzle/schema.ts`, then run `pnpm db:push`
- Timestamps stored as `timestamp` columns (PostgreSQL), displayed in user's local timezone (client-side)

### Authentication Flow
1. OAuth redirect to provider (Manus OAuth with PKCE)
2. Callback returns code + state, backend exchanges for tokens
3. Userinfo fetched, user upserted to DB
4. JWT signed (HS256) with `openId`, `tenantId`, `role`, stored in HTTP-only cookie
5. Every request: cookie parsed → JWT verified → `ctx.user` populated
6. Protected procedures check `ctx.user` existence; admin procedures check `ctx.user.role`

### Payment Integrations
- **Stripe:** Subscriptions via checkout sessions (`stripe.checkout.sessions.create()`), webhooks at `/api/stripe/webhook` (verify signature with `STRIPE_WEBHOOK_SECRET`)
- **PayPal:** Orders via PayPal SDK (`/api/paypal/create-order`, `/api/paypal/capture-order`)
- **Square:** Orders via Square SDK
- **Shopify:** External redirect to tenant's Shopify checkout URL
- Test card: `4242 4242 4242 4242` (Stripe sandbox)
- Subscription status synced from webhooks to `tenants.subscriptionStatus` (`active`, `trialing`, `past_due`, `cancelled`, `none`)

### Webhook Handling
- Webhooks registered **before** JSON middleware in Express (`server/_core/nonTrpcRoutes.ts`)
- Signature verification required for all webhooks (Stripe, Shopify, n8n)
- Webhook events logged to `webhook_events` table with status (`pending`, `processed`, `failed`, `skipped`)

### Path Aliases
```typescript
"@/*"         → client/src/*
"@shared/*"   → shared/*
```
Configured in `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`

## Key Conventions

### TypeScript Strictness
- Strict mode enabled: `no-explicit-any` (warn), `no-non-null-assertion` (warn), `no-unused-vars` (error)
- Unused variables must be prefixed with `_` to bypass linting
- Use `const` over `let`; never use `var`
- Module resolution: `bundler` mode

### React Patterns
- Hooks rules enforced (`react-hooks/rules-of-hooks`)
- Only export components from page/component files (`react-refresh/only-export-components`)
- Use `cn()` utility (`@/lib/utils`) for conditional class merging (tailwind-merge + clsx)
- shadcn/ui components: New York variant, neutral base color, CSS variables for theming

### UI/Styling
- Tailwind CSS 4 with `@tailwindcss/vite` plugin
- Design system: shadcn/ui (Radix UI primitives + Tailwind)
- Component config: `components.json` (style: new-york, baseColor: neutral)
- Dark mode via `next-themes` provider

### Testing Conventions
- Tests colocated with source: `server/**/*.test.ts`, `server/**/*.spec.ts`
- Test utilities in `server/__tests__/` (mocks, fixtures, helpers)
- Run single test: `vitest run path/to/file.test.ts`
- Test new procedures before committing (part of PR checklist)
- Test rules relaxed: `@typescript-eslint/no-explicit-any` off in test files

### Error Handling
- tRPC errors: use `TRPCError` with appropriate codes (`UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`, `NOT_FOUND`, `INTERNAL_SERVER_ERROR`)
- Custom errors in `shared/errors.ts`, imported via `@shared/errors`
- Consistent error messages in `@shared/const` (e.g., `UNAUTHED_ERR_MSG`, `NOT_ADMIN_ERR_MSG`)

### Environment Variables
- Server-side: accessed via `process.env` (validated in `server/_core/env.ts`)
- Client-side: prefixed with `VITE_` (available at build time)
- Required vars: `DATABASE_URL`, `JWT_SECRET`, `PUBLIC_APP_URL`, OAuth credentials
- Optional vars: payment provider keys (Stripe, PayPal, Square), email (Resend), Supabase, AWS S3, Sentry

## Critical Rules

### Multi-Tenancy (Cathedral Principle)
- **Do not break multi-tenancy** — every query that touches tenant data MUST filter by `tenantId`
- **Never** return cross-tenant data — this is a security violation
- **Always** use `ctx.user.tenantId` from JWT claims for filtering
- Admin-only procedures check `ctx.user.role === 'admin'` before execution

### Database Integrity
- **Drizzle schema is the source of truth** — update `drizzle/schema.ts` first, then `pnpm db:push`
- **Never** write raw SQL in routers — extend `server/db.ts` helpers instead
- **Never** store file bytes in DB columns — use S3 via `storagePut()` (in `server/storage.ts`)
- **Always** use soft deletes or status flags for reversible operations

### Webhook Security
- **Always** verify webhook signatures before processing (Stripe, Shopify, n8n)
- **Never** skip signature verification (security violation)
- Log all webhook events to `webhook_events` table

### Code Quality
- **Always** validate tRPC inputs with Zod schemas
- **Always** use `protectedProcedure` for authenticated routes, `publicProcedure` only for public endpoints
- **Always** add a corresponding Vitest test for new procedures
- **Never** hardcode ports — use `process.env.PORT`
- Fix lint errors before committing (pre-commit hooks enforce this)

### Package Management
- **pnpm only** — do not use npm or yarn in this project
- pnpm patches applied to `wouter@3.7.1` (see `patches/wouter@3.7.1.patch`)
- Security overrides in `package.json` for vulnerable deps

## Architecture Principles (Cathedral Principle)
1. **Automate infrastructure before scaling traffic** — AI agents, n8n workflows, scheduled jobs
2. **Decoupled, event-driven systems** — prefer webhooks over polling
3. **Every mutation needs a kill switch** — soft-delete, status flags, rollback mechanisms
4. **Security first** — never expose secrets client-side, validate all inputs with Zod, verify webhook signatures
5. **Scalability without headcount** — agentic AI + automation over manual ops

## Subscription Plans & Status
- Plans stored in `plans` table, referenced by `tenants.planId`
- Subscription status tracked in `tenants.subscriptionStatus`:
  - `active` — active subscription
  - `trialing` — trial period
  - `past_due` — payment failed, grace period
  - `cancelled` — subscription ended
  - `none` — no subscription
- Stripe webhook syncs status changes to `tenants` table

## PR Review Checklist
When reviewing PRs, verify:
1. ✅ `tenantId` scoping on all DB queries
2. ✅ Zod validation on all tRPC inputs
3. ✅ No secrets in client-side code
4. ✅ Vitest coverage for new procedures
5. ✅ No breaking schema changes without migration
6. ✅ TypeScript strict mode compliance (no `any` unless justified)
7. ✅ Webhook signature verification (if adding webhook handlers)
8. ✅ Pre-commit hooks pass (lint + format)
