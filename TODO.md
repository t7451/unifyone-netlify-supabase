# UnifyOne / 1commerce.online — Platform Scope Finalization

**Status as of:** 2026-05-06  
**Repo:** [`t7451/unifyone-netlify-supabase`](https://github.com/t7451/unifyone-netlify-supabase) — HEAD `54d3011`  
**Production:** <https://1commerce.online>  
**Cathedral phase:** Foundation ✅ → Revenue ✅ → Systems ✅ → Scale ✅ → Optimize ⏳ (Scale + scope-A/B polish closed; Optimize kicked off with agent automation + Kai credits + MCP normalization)

---

## Foundation — done

Auth, multi-tenancy, payment plumbing, observability.

- **Custom auth** (scrypt + jose HS256 JWT in `app_session_id` cookie). `passwordChangedAt` is the JWT kill-switch — bumped on any auth-state change to revoke sessions immediately. Email verification via emailVerificationToken; password reset via passwordResetToken with TTL.
- **Multi-tenant data isolation** via `tenants.id` FK on every business object (orders, products, customers, discounts, etc.). Tenant-creator promoted to `role=admin` on `tenant.create` (CR2).
- **Stripe subscriptions live** — plumbing complete end-to-end (`subscription.createCheckout` tRPC → `/api/stripe/create-checkout` → Stripe Checkout → `checkout.session.completed` webhook → `tenants.subscriptionStatus`). `stripe_webhook_events` table for idempotency on `event_id`, tenant link via Stripe Checkout `metadata.tenant_id` (server-stamped from JWT), recovery endpoint at `/api/admin/recover-subscription` for reattaching stranded payments. **The `plans` table must be seeded with real Stripe price IDs before customers can subscribe** — run `pnpm seed:plans` (see "Subscription activation runbook" below).
- **`/api/health` v2** pings db + stripe + resend + redis with per-dep latency. Returns `{status:"ok|degraded"}`.
- **Deploy-failure notifier** at `/api/admin/deploy-events`: Netlify webhook receiver, registers itself on first call, writes `deploy_events` rows, alerts via Resend on failure.

## Revenue — done

Every payment path that lets money flow into a tenant.

- **Stripe Checkout** (subscriptions + one-time). Webhook idempotency via `stripe_webhook_events.event_id`. Server-stamped `metadata.tenant_id` at session creation; `resolveTenantForCheckout` in `server/stripe.ts` reattaches if it gets dropped.
- **Stripe one-time refunds** via `orders.refund` tRPC mutation (commit `adf7ce1`, H6) — calls `stripe.refunds.create`, supports partial via `amountMinor`, idempotent via `paymentStatus="refunded"` guard, stamps `unifyone_*` metadata on the Stripe refund.
- **PayPal Smart Buttons + REST checkout.** `registerPayPalFetchRoutes` mounted under `/api/paypal/*`. Webhook verification via `/v1/notifications/verify-webhook-signature` (PayPal does NOT use HMAC). Tenant linking via `custom_id` in purchase_units.
- **Square Web Payments + Hosted Checkout.** `registerSquareFetchRoutes` mounted under `/api/square/*`. HMAC-SHA256 over `(notification_url + raw body)`. Operators MUST set `SQUARE_WEBHOOK_NOTIFICATION_URL` env var to defend against host-header injection.
- **Shopify webhook receiver** at `/api/shopify/webhook` (CR4 — commits `2ba2c51` + `0b9ae87`). HMAC-SHA256 base64 timing-safe compare against `SHOPIFY_API_SECRET`. Topic→entity map covers orders/{create,updated,cancelled,paid,fulfilled}, products/{create,update,delete}, customers/{create,update,delete}, inventory_levels/update, fulfillments/{create,update}. OAuth install/callback at `/api/shopify/install` and `/api/shopify/callback` upsert into `shopifyStores`.

## Systems — done

The cross-cutting machinery any feature can call.

- **tRPC routers** — 45+ routers under `server/routers/` aggregated into `appRouter` in `server/routers.ts`. Highlights: orders, products, customers, discounts, user, tenant, team, integrations, social, subscription, gigWorker, gamification, governance, claudeGovernance, knowledgeGraph, leads, mobileAutomation, moneyManager, notifications, mcp, cli, developer, dealflow, affiliates, referral, rewards, themes, terpforge, sovereign, syncMonitor, etc.
- **Audit logs** — `audit_logs` table + `logAudit({userId, tenantId, action, resource, resourceId, severity, metadata})` helper in `server/auditLogger.ts`. Fire-and-forget; severity=critical triggers escalation queue.
- **Notifications** — `notifications` table fed by `db.insert(notifications).values(...)` after revenue-relevant mutations. Order create/refund, change-password/email/delete fire notification rows so the bell shows the activity.
- **Webhook events** — `webhook_events` shared log (stripe/shopify/n8n/internal). Plus dedicated `stripe_webhook_events`, `paypal_webhook_events`, `shopifySyncLog` for forensic detail.
- **Express vs Fetch normalization** — `server/lib/cookieHeader.ts` and `server/lib/authHeader.ts` provide `getCookieHeader(req)` and `getAuthorizationHeader(req)` that branch on `headers instanceof Headers`. Server files mixing Express + Fetch must alias express imports as `ExpressRequest`/`ExpressResponse` (CR1 + CR4 fixups taught us this twice).
- **API keys (Bearer auth)** — `uo_live_*` / `uo_test_*` tokens hashed SHA-256 in `api_keys.keyHash`, looked up in `sdk.authenticateRequest` Bearer branch (CR1, commits `db65e86` + `de42da6`).
- **Rate limits** — auth endpoints 10/15min, password-reset 3/15min shared across endpoints. Stored in Redis.
- **Voyage AI embeddings** for documentChat retrieval — embeddings stored alongside documents, queried via cosine distance.
- **Impact.com S2S affiliate tracking** — click capture at `/api/impact/click`, conversion firing on Stripe + PayPal + Square successful captures with `stripeSessionId`-style key reuse (`paypal_<orderId>`, `square_<paymentId>`).
- **Resend email** — domains verified for `1commerce.online` and `unifyonecommerce.com`. Used for verification, password reset, team invites (CR3).
- **Cloudflare DNS + edge** — DNS zones managed via Cloudflare; Bot Fight Mode disabled to prevent it blocking Stripe checkout.
- **n8n** — outbound only, via `n8nTrigger` tRPC mutation. No inbound receiver needed.

## Scale — just shipped

The UX surface area users actually touch every day.

- **Settings overhaul (`a82d610`):** SecuritySettings.tsx now exposes:
  - **Change password** — current pw verify, scrypt-hash new, bumps `passwordChangedAt` (auto-logout 1.5s after success).
  - **Change email** — password verify, uniqueness check, sets `emailVerified=false` and clears the verification token, bumps `passwordChangedAt`.
  - **Delete account** — GDPR Article 17 / CCPA right-to-delete. Two-step reveal + email-and-password confirm. Sets `users.deletedAt`; auth subsequently rejects every session for that user.
- **Bulk delete on Products (`a353566`, Item 1):** row checkboxes + "Delete N selected" with confirm dialog. New `products.bulkDelete({ ids })` mutation.
- **Manual customer create (`ecf2d5b`, Item 2):** `customers.create` tRPC mutation idempotent on (tenantId, email) — duplicates merge instead of erroring. `AddCustomerDialog` modal in `client/src/components/`. Wired into the Customers page header.
- **Image upload via Netlify Blobs (`ab8556b`, Item 3):** `POST /api/uploads/image` Fetch route, multipart form data, image/\* only, max 5MB, auth-gated. Stores in `uploads` blob store keyed `t<tenantId>/u<userId>/<ts>-<rand>.<ext>`. Re-served via `GET /api/uploads/image/:key` with immutable cache headers. Lazy-imports `@netlify/blobs` so local dev returns 501 with a clear message instead of crashing.
- **Discounts / Coupons (`7f30151`, Item 4):** new `discounts` table with (tenantId, code) unique index, type enum (percentage|fixed). Apply via `pnpm drizzle-kit push` (NOT migrate). Router has list/create/update/toggleActive/delete + `resolveCode` for checkout validation. Page at `/discounts` with toggle/delete/create dialog. Code uppercased + regex-validated; CONFLICT on duplicate.
- **Settings sidebar Billing + Team (`c297ee3`, Item 5):** SettingsLayout.tsx surfaces the existing top-level `/billing` and `/team` routes from inside the settings group so users find them without bouncing to the dashboard nav.

### Scope-A polish — shipped 2026-05-05 (post-finalization)

- **Discount code at checkout (`f9c484f`):** `orders.create` accepts an optional `discountCode`. Server resolves against `discounts` table (uppercase, validity window, usage cap), computes `discountAmount`, stamps it in `orders.discountAmount`, and increments `discounts.usageCount` atomically post-insert. Failed lookups silently produce a 0 discount so a typo never blocks checkout. Audit log row on apply.
- **Subscription plan switching (`8c466e6`):** `subscription.changePlan({ planSlug, billingCycle })` patches the active Stripe subscription via `stripe.subscriptions.update` with `proration_behavior="create_prorations"`. Resolves target Stripe price id from `plans.stripePriceIdMonthly|Yearly`. Refuses if no active subscription; no-op success if already on that plan/cycle. Audit log severity=high (recurring revenue change).
- **`customers.notes` restored (`d01099e`):** schema, server input, and `AddCustomerDialog` UI all carry the field again. Apply via `pnpm drizzle-kit push` before deploying.

### Scope-B polish — shipped 2026-05-05 evening

- **Postman v2.1 collection (`87d9fc0`):** `GET /api/postman/collection.json` returns a Postman collection covering Health, Auth, Payments (Stripe/PayPal/Square), Shopify, Uploads, Affiliate Tracking, Admin, and a tRPC envelope example. `GET /api/postman/environment.json?env=production|local` returns matching environment file. Three vars: `base_url`, `api_key` (uo*live*_/uo*test*_), `admin_api_key`. Drop into Postman and you're hitting UnifyOne in 30 seconds.
- **`<ChangePlanCard />` on /billing (`c34e979`):** wires `subscription.changePlan` into the existing Billing page with monthly/yearly toggle, current-plan badge, per-plan loading state, and a proration warning. `subscription.getStatus` invalidates on success.
- **Shopify hardening (`0d8b929`, external PR):** encrypted tokens at rest, DB-backed CSRF, mandatory webhooks, income calculator.
- **Axios bump (`bda25c4`, dependabot):** moderate vuln resolved.

### Optimize phase — kicked off 2026-05-06

Day-of work post-`c34e979`. Focus shifted from feature surface to automation, AI credits, observability, and dependency hygiene.

- **Agent automation infrastructure (`2229370` → `3a1a7b5`, ~15 commits):** Three GitHub Action agents under `.github/workflows/`:
  - `unifyone-dev-agent.yml` + `.github/scripts/unifyone-dev-agent.js` — code-change agent with MCP 2025-03-26 client support (`ed3007b`), Groq as the primary free model (`bb139f2`), free-fallback mode (`a629f24`).
  - `unifyone-ux-ui-agent.yml` + `.github/scripts/unifyone-ux-ui-agent.js` — UX/UI agent with free-fallback (`311673f`); guarantees the dev server is shut down on exit (`2470c8c`).
  - `unifyone-main-agent.yml` — orchestrator that spawns dev + ux-ui + quality in parallel (`8c65462`); pnpm v10 + Node 24 alignment (`d094458`); hidden agent-report artifact upload across all three workflows (`3a1a7b5`).
  - Shared utilities in `.github/scripts/agent-utils.js`, `unifyone-orchestrator.js`, `unifyone-issue-reporter.js`, `unifyone-mcp-agent.js`, `unifyone-quality-agent.js` (`643a788`).
- **Kai credits end-to-end (`1343839`):** purchase + balance + ledger model. New router, checkout flow, balance UI. Migration `0041_kai_credits.sql` adds `kai_credit_packages`, `kai_credit_purchases`, `kai_credit_ledger` tables plus enums `kai_credit_purchase_status` (pending|paid|failed|cancelled|refunded) and `kai_credit_ledger_type` (purchase|usage|adjustment|refund). **Apply via `Apply production migration` Action with default `MIGRATION_FILE`.**
- **Kai chat concurrency stress test + credit enforcement (#119, `54d3011`):** new `server/__tests__/ai.kaiCreditEnforcement.test.ts`, hardened fallback chain in `server/_core/llm.ts`, expanded `server/lib/kaiAgent.test.ts` and `kaiModels.test.ts`. Adds 4 env vars to `.env.example`.
- **MCP tool normalization (`eabebda`):** snake_case for tool names + args across `netlify/functions/mcp-server.ts`, `mcp.mjs`, `server/lib/mcpClient.ts`, `server/routers/mcp.ts`, plus new dispatcher tests. 1,737 +/333 −.
- **Production health probe (`f408bbd`):** `scripts/probe-health.ts` + `server/healthProbeScript.test.ts`; surfaced via `pnpm` script.
- **Protected-route auth e2e (`5628fb9`):** expanded coverage in `e2e/auth.spec.ts`.
- **Dependency hardening (`5129bfa`, `682de9e`):** pnpm overrides hardened, `path-to-regexp` pinned.
- **New migrations awaiting prod:** `0039_deploy_events.sql`, `0040_paypal_square_webhook_events.sql`, `0041_kai_credits.sql`.

---

## Subsidiary brands & next-up surface area

### Active — operating against UnifyOne today

- **1Commerce Solutions** (1commercesolutions.com) — service brand / consultancy front for the platform. Now also hosts The Signal blog content.
- **The Signal** (https://1commercesolutions.com, repo `The-signal`) — blog brand mounted on the consultancy front.
- **ClearPath Environmental** (repo `Clearpath`) — environmental services vertical.
- **Compass AI** (repo `compass`) — AI consulting / legal intelligence vertical.
- **Torqued Affiliates** (`torqued-affiliates`, `news-aggregator`) — affiliate platform; conversions feed Impact.com S2S.
- **PACER** (repo `PACER`) — domain arbitrage + RWA pipeline.
- **DealFlow** (https://1commerce.world) — deal pipeline / business broker surface.
- **PNW Solutions** (repo `pnwenterprises`) — shell, holding-company surface.
- **UnifyOne Shopify storefront** (`unifyone-2.myshopify.com`, demo at https://1commerce.shop) — actual digital product catalog. Active SKUs include **n8n Commerce Workflow Pack**, **AI Prompt Library v2.0**, **Solo Agency Blueprint**, **Shopify Launch Kit**, plus ~16 more digital products. This is a real revenue surface, not just a demo. Currently under catalog-pollution audit (dropshipped items being culled).

### In flight — separate platforms / initiatives

- **Gov Contract Watch** — government contract intelligence platform with a Flask-based control surface. Distinct from UnifyOne but follows the same Cathedral Principle phasing.
- **Neural Knowledge Graph** — internal product with a cyan-themed neural UI override. Knowledge graph ingesters being refactored to support multi-source ingest.
- **Trading bot dashboard** — Flask-based control surface for managing trading bot strategies. Internal tooling, not yet customer-facing.
- **PartnerStack enrollment** — partner program application in flight via dash.partnerstack.com.
- **Meta developer platform** — Flutter app + payment integration; building toward a Meta (FB/IG) developer surface for the social commerce flow.
- **Signal Archives** — new project, architectural shift to Cloudflare Pages + Functions + D1. Build spec drafted; implementation pending.

### Planned — not built yet

- **InkVault Portal** — branded customer portal vertical.
- **FORGE3D Studio** — 3D design / fabrication brand.
- **KSK Industrial / KSK Operations** — industrial subsidiaries (PNW Solutions umbrella).
- **P.A.K.C. Education / P.A.K.C. Tech Services** — education + tech subsidiaries.
- **Cascadia Recovery** — surplus-funds operator business.

When any of these need a tenant, spin one up via the existing onboarding flow — UnifyOne already supports them as separate tenants without code changes.

---

## Operational backlog (non-blocking)

Things noticed during the audit-fix rollout that aren't blocking revenue but are worth doing during normal polish cycles. None are P0.

- **Husky pre-commit eslint hook** is strict (max-warnings=20, fails on unused-imports). Worked-around twice this session by re-running with the route wired correctly. Consider relaxing during scaffolding-heavy work.
- **drizzle migrations partially broken** — must use `drizzle-kit push`, not `migrate`. The new `discounts` table needs to be pushed against prod once.
- **14 Dependabot alerts** on the default branch (4 high, 9 moderate, 1 low) per the latest push. Triage during a maintenance window — most are likely transitive.
- **`SHOPIFY_API_SECRET`** must be set on Netlify for the Shopify webhook receiver to accept anything. Without it, `validateShopifyWebhook` fails closed (intentional security default).
- **Image upload requires Netlify Blobs** to be available — works automatically on Netlify Functions runtime, but local dev returns 501 unless you set up a local blob store.
- **Customers schema has no `notes` column** — added it to the input schema and dropped it; if you want notes on customers, add the column via drizzle-kit push and re-add `notes` to the create/update mutations.
- **BillingSettings page** (drafted in `__finalize.py` but not shipped — the existing top-level Billing page already covers it). If you want a settings-scoped Billing dashboard distinct from `/billing`, it can be revived from the scratch directory.
- **Subscription plan switching** — works via `/pricing` redirect; no in-place plan-change flow yet.
- **Discount usage counting** — `usageCount` increments via the `resolveCode` query but the actual increment happens at checkout; verify the orders flow consumes a discount when present.
- **Voice transcription scaffolding** in `server/_core/voiceTranscription.ts` is documented but commented out — wire it into a router when needed.
- **UnifyOne Shopify storefront — catalog pollution audit** — Keith was actively culling dropshipped items from the active SKU list. ~20 digital products remain valid; the ones flagged "sold out" are being normalized. Coordinate with the Shopify admin at `unifyone-2.myshopify.com`.
- **Shopify Collective supplier sync** — physical-product sync issue under investigation. Distinct from the webhook receiver (CR4) — this is the inbound product-import path from suppliers.
- **AES-256-GCM Shopify token encryption + DB-backed CSRF** shipped in PR #116 (`0d8b929`) — verify SHOPIFY_ENCRYPTION_KEY env var is set on Netlify and the migration that adds the encryption columns has been applied.
- **IncomeCalculator** also landed in PR #116 — surface a route or page for it if customers should access.
- **Branch protection** has `enforce_admins=false` for solo-dev workflow; flip to true once a second engineer joins.

---

## Quick reference

### Subscription activation runbook

The app's subscription flow is wired end-to-end in code, but a customer can only subscribe once Stripe products/prices exist **and** the `plans` table (Neon) holds the resulting price IDs. To turn that on (or to refresh prices after editing `shared/pricing.ts`):

```bash
# 1. (optional) preview what would change
pnpm seed:plans -- --dry-run

# 2. apply for real (creates/reuses Stripe products + prices, upserts plans rows)
pnpm seed:plans

# 3. if Stripe was already seeded by another mechanism, just sync the DB rows
pnpm seed:plans -- --skip-stripe
```

The script (`scripts/seed-plans.ts`) is idempotent. It reuses Stripe products by `metadata.uo_plan_slug` and prices by `lookup_key` (`unifyone_<slug>_<monthly|yearly>`), and upserts `plans` rows by `slug`. Required env: `STRIPE_SECRET_KEY` + `DATABASE_URL` (or `NETLIFY_DATABASE_URL`).

### Production URLs

- **App (UnifyOne):** <https://1commerce.online>
- **Brand fronts:** <https://1commercesolutions.com> (Signal/blog) · <https://1commerce.world> (DealFlow) · <https://1commerce.shop> (Shopify demo)
- **API health:** <https://1commerce.online/api/health>
- **Stripe webhook:** `https://1commerce.online/api/stripe/webhook`
- **PayPal webhook:** `https://1commerce.online/api/paypal/webhook`
- **Square webhook:** `https://1commerce.online/api/square/webhook`
- **Shopify webhook:** `https://1commerce.online/api/shopify/webhook`
- **Image upload:** `POST https://1commerce.online/api/uploads/image` (multipart, image/\*, ≤5MB, auth-gated)

### Required Netlify env vars

| Var                                                                                                               | Purpose                          |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `JWT_SECRET`                                                                                                      | jose HS256 signing key           |
| `DATABASE_URL`                                                                                                    | Neon Postgres connection         |
| `STRIPE_SECRET_KEY`                                                                                               | live + test                      |
| `STRIPE_WEBHOOK_SECRET`                                                                                           | webhook signature verify         |
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET`                                                                          | OAuth + webhook HMAC             |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID`                                                 | PayPal checkout + webhook verify |
| `SQUARE_ACCESS_TOKEN` / `SQUARE_LOCATION_ID` / `SQUARE_WEBHOOK_SIGNATURE_KEY` / `SQUARE_WEBHOOK_NOTIFICATION_URL` | Square checkout + webhook        |
| `RESEND_API_KEY`                                                                                                  | transactional email              |
| `VOYAGE_API_KEY`                                                                                                  | document chat embeddings         |
| `IMPACT_ACCOUNT_SID` / `IMPACT_AUTH_TOKEN`                                                                        | affiliate S2S                    |
| `ADMIN_API_KEY`                                                                                                   | gates `/api/admin/*` endpoints   |
| `NETLIFY_DEPLOY_NOTIFY_TOKEN`                                                                                     | deploy-event webhook auth        |
| `REDIS_URL`                                                                                                       | rate limit + session cache       |

### Cathedral phase pointer

**Scale closed this round.** Next deliberate phase is _Optimize_ (perf, observability dashboards, runbook automation) — not a Cathedral phase per se, but the natural next gradient.
