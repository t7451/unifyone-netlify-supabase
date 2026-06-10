# Database Architecture: Neon vs Supabase Split

**Status: current as of June 2026.** This hybrid architecture is deliberate —
it supersedes the earlier plan to remove Supabase entirely (see
`SUPABASE_REMOVAL.md`, now historical).

UnifyOne uses **two** Postgres databases:

## 1. Neon Postgres (Primary / Main Database)

- **Connection:** `DATABASE_URL` (via Drizzle ORM; schema in `drizzle/schema.ts`)
- **Purpose:** Core application data and most business logic (~77 tables)
- **Key areas:**
  - Users, Tenants, Customers
  - Orders, Products, Inventory, Carts
  - Clips, Clipping Jobs, AI usage (`gig_ai_usage`, `ai_conversations`)
  - Challenges, Achievements, Points, Rewards, Governance
  - Shopify, Stripe/PayPal/Square webhook records
  - Analytics, Notifications, Social accounts, Referrals

**Neon is the source of truth for the majority of the application.**

## 2. Supabase Postgres (Supplementary / Specialized Layer)

- **Purpose:** Credit metering, usage tracking, and Stripe billing logic
- **Connection:** `@supabase/supabase-js` with the secret key — see
  `server/_core/supabaseAdmin.ts`
- **Key components:**
  - `subscription_tiers`
  - `stripe_products`, `stripe_prices`, `stripe_subscriptions`
  - `credit_balances`
  - `credit_usage_events`
  - `credit_overage_queue`
  - `credit_usage_hourly` (pre-aggregated stats, written by the scheduled
    Netlify function `aggregate-credit-stats-scheduled.mts`)
  - **Critical function:** `consume_credits_with_meter(...)` — atomic credit
    deduction with row locking, overage logic, and usage logging (called from
    `server/creditMeter.ts`)
- **Why Supabase stays:** the atomic credit-consumption function (with
  overage handling for Stripe invoicing) was kept on Supabase during the
  auth migration. It also powers optional Realtime features
  (`client/src/lib/supabaseRealtime.ts`).

## Summary

| Database | Role                   | Main technology  | What it contains                                                                           | Status             |
| -------- | ---------------------- | ---------------- | ------------------------------------------------------------------------------------------ | ------------------ |
| Neon     | Primary / core app     | Drizzle ORM      | Users, orders, clips, challenges, governance, Shopify, most business data                  | Main production DB |
| Supabase | Credit + billing layer | Direct SQL + RPC | Credit balances, usage events, overage queue, Stripe objects, `consume_credits_with_meter` | Specialized layer  |

## Auth situation

- **Primary auth** is custom JWT + Drizzle on Neon
  (`server/_core/customAuth.ts`). See `AUTHENTICATION.md`.
- **Supabase OAuth** remains active in parallel for external OAuth flows and
  specific integrations — it is **not** the main authentication provider.
  Endpoints and configuration are documented in `docs/OAUTH.md`.

## Code map

| Concern                                         | Backed by         | Code                                                     |
| ----------------------------------------------- | ----------------- | -------------------------------------------------------- |
| Auth (signup/signin)                            | Neon via Drizzle  | `server/_core/customAuth.ts`                             |
| Tenants/products/orders                         | Neon via Drizzle  | `server/routers/*`, `drizzle/`                           |
| Credit metering                                 | Supabase RPC      | `server/creditMeter.ts`                                  |
| Credit top-up billing                           | Supabase          | `server/billing.ts`                                      |
| Stripe subscriptions/products/prices            | Supabase          | `server/stripe.ts`, `server/routers/subscription.ts`     |
| Shared admin client                             | Supabase          | `server/_core/supabaseAdmin.ts`                          |
| Credit stats aggregation (hourly cron)          | Supabase          | `netlify/functions/aggregate-credit-stats-scheduled.mts` |
| Real-time push (optional)                       | Supabase Realtime | `client/src/lib/supabase*.ts`                            |
| Supabase OAuth token exchange (legacy/parallel) | Supabase Auth     | `server/_core/oauth.ts`                                  |

## Environment variables

| Variable                                                                   | Purpose                                                       |
| -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`                                                             | Neon — primary database                                       |
| `SUPABASE_URL` / `VITE_SUPABASE_URL`                                       | Supabase project URL                                          |
| `SUPABASE_SECRET_KEY`                                                      | Server-side key, new format (`sb_secret_…`)                   |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY`               | Browser-safe key, new format (`sb_publishable_…`)             |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY` | Legacy key fallbacks (older projects)                         |
| `SUPABASE_JWT_SECRET`                                                      | Legacy HS256 JWT secret; new projects verify via JWKS instead |

The code prefers the new `sb_*` key names and falls back to the legacy names,
so either set works.
