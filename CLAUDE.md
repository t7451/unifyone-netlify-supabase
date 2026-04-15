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
