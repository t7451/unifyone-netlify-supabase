# UnifyOne Copilot Instructions

## Project Overview
UnifyOne is a multi-tenant SaaS commerce platform built for PNW Enterprises / 1Commerce LLC.
It unifies Shopify, Stripe, PayPal, n8n, and Supabase Realtime under one dashboard.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS 4, shadcn/ui, Wouter (routing), tRPC client
- **Backend**: Express 4, tRPC 11, Drizzle ORM, PostgreSQL (Neon)
- **Auth**: Manus OAuth (session cookie, `protectedProcedure`)
- **Payments**: Stripe (subscriptions + one-time), PayPal REST API (live)
- **Realtime**: Supabase Realtime WebSocket channels
- **Testing**: Vitest

## Architecture Principles (Cathedral Principle)
1. Automate infrastructure before scaling traffic
2. Decoupled, event-driven systems — prefer webhooks over polling
3. Every mutation needs a kill switch (soft-delete, status flags)
4. Security first: never expose secrets client-side, validate all inputs with Zod
5. Scalability without headcount: agentic AI + automation over manual ops

## Key File Locations
```
server/routers.ts          → tRPC router registry
server/routers/            → Feature routers (tenant, products, orders, analytics, integrations, subscription)
server/db.ts               → Drizzle query helpers (always use these, never raw SQL in routers)
server/stripe.ts           → Stripe webhook handler + checkout session
server/paypal.ts           → PayPal REST order create/capture
drizzle/schema.ts          → Database schema (source of truth)
client/src/pages/          → Page components
client/src/components/     → Reusable components (DashboardLayout, SubscriptionWidget, RealtimeStatus)
client/src/lib/trpc.ts     → tRPC client binding
```

## Coding Standards
- **Never** add raw SQL in routers — use or extend helpers in `server/db.ts`
- **Always** use `protectedProcedure` for authenticated routes, `publicProcedure` only for public endpoints
- **Always** validate inputs with Zod schemas in tRPC procedures
- **Always** add a corresponding Vitest test for new procedures in `server/*.test.ts`
- **Never** store file bytes in DB columns — use S3 via `storagePut()`
- **Never** hardcode ports — use `process.env.PORT`
- Use `tenantId` scoping on ALL data queries — never return cross-tenant data
- Timestamps: store as UTC Unix ms, display in user's local timezone

## Multi-Tenancy Rules
- Every table with tenant-scoped data MUST have a `tenantId` foreign key
- All queries MUST filter by `tenantId` from `ctx.user.tenantId`
- Admin procedures MUST check `ctx.user.role === 'admin'`

## Payment Rails
- **Stripe**: subscriptions via `stripe.checkout.sessions.create()`, webhooks at `/api/stripe/webhook`
- **PayPal**: orders via `/api/paypal/create-order` + `/api/paypal/capture-order`
- **Shopify**: external redirect via tenant's `shopifyCheckoutUrl`
- Test card: `4242 4242 4242 4242` (Stripe sandbox)

## Subscription Plans
Plans are in the `plans` table. Tenants reference `planId`. Status tracked in `subscriptionStatus` field.
Status values: `active`, `trialing`, `past_due`, `cancelled`, `none`

## PR Review Checklist
When reviewing PRs, check:
1. tenantId scoping on all DB queries
2. Zod validation on all tRPC inputs
3. No secrets in client-side code
4. Vitest coverage for new procedures
5. No breaking schema changes without migration
6. TypeScript strict mode compliance (no `any` unless justified)
