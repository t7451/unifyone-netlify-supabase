# UnifyOne — Project TODO

## Database & Backend
- [x] Multi-tenant schema: tenants, plans, subscriptions
- [x] Product catalog schema: products, categories, inventory
- [x] Order system schema: orders, order_items, cart_items
- [x] Analytics schema: events table
- [x] Webhook events schema: webhook_events
- [x] Run all migrations via webdev_execute_sql
- [x] tRPC procedures: tenant CRUD + plan management
- [x] tRPC procedures: product CRUD + inventory tracking
- [x] tRPC procedures: order processing + status tracking
- [x] tRPC procedures: analytics queries
- [x] tRPC procedures: Stripe checkout + subscription billing
- [x] tRPC procedures: Shopify product sync + order fulfillment
- [x] tRPC procedures: n8n webhook trigger
- [x] Stripe webhook handler (server route)
- [x] Shopify webhook handler (server route)

## Frontend
- [x] Design system: dark theme, color tokens, typography (UnifyOne brand)
- [x] Landing page with hero, features, pricing sections
- [x] Auth flow: login with role-based redirect
- [x] Dashboard layout with sidebar navigation (7 nav items)
- [x] Tenant setup page (first-time onboarding)
- [x] Product catalog page with CRUD modal
- [x] Orders list with status badges and filters
- [x] Customers page
- [x] Analytics dashboard with charts (revenue, orders, customers)
- [x] Integrations page (Stripe, Shopify, n8n)
- [x] Settings page (tenant profile, billing, subscription plans)

## Integrations
- [x] Stripe: checkout sessions, customer portal
- [x] Shopify: product sync, order webhook ingestion
- [x] n8n: outbound webhook triggers for order events
- [ ] Supabase Realtime: live order + inventory updates (future enhancement)

## Testing & Polish
- [x] Vitest: auth/role tests (8 tests passing)
- [x] Vitest: tenant isolation tests
- [x] Vitest: analytics and products tests
- [x] TypeScript: 0 errors
- [ ] Responsive design check (manual)
- [ ] Empty states for all list views (partial)

## Phase 2 — Stripe, CRUD, Netlify
- [x] Pull latest UnifyOne-CSS and apply design updates
- [x] Wire STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET via secrets
- [x] Implement Stripe checkout session creation (live keys)
- [x] Implement Stripe webhook handler (payment_intent, subscription events)
- [x] Build product CRUD modal: create product form
- [x] Build product CRUD modal: edit product form
- [x] Build product CRUD modal: delete confirmation
- [x] Add inventory management inline in Products page
- [x] Configure netlify.toml for operation-v3.netlify.app
- [x] Update app title and meta tags for production
- [x] Run full test suite (14/14 passing) and save checkpoint

## Phase 3 — Stripe Checkout, Order CRUD, Realtime
- [x] Wire Stripe checkout button in Settings page (real checkout session)
- [x] Add Stripe customer portal link in Settings billing section
- [x] Build order detail modal with line items and status timeline
- [x] Add create order form (manual order entry)
- [x] Add order status update flow (pending → processing → shipped → delivered)
- [x] Add order search and status filter
- [x] Supabase Realtime: live order status updates
- [x] Supabase Realtime: live inventory quantity updates
- [x] Run full test suite (14/14) and save checkpoint

## Phase 4 — Customers CRUD, Dashboard Analytics, GitHub Export
- [ ] Request Supabase Realtime secrets (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] Build Customers CRUD page with profile modal and order history
- [ ] Build real Dashboard page with KPI cards and recharts analytics
- [ ] Add Dashboard revenue chart (last 30 days)
- [ ] Add Dashboard top products widget
- [ ] Add Dashboard recent orders feed
- [ ] Run full test suite and save checkpoint

## Bug Fixes
- [x] Fix /api/oauth/login 404 — ProtectedRoute now uses getLoginUrl() correctly

## Phase 5 — Env Wiring, Polish, GitHub Push
- [x] Wire VITE_OAUTH_PORTAL_URL secret (system secret, auto-injected)
- [x] Wire VITE_APP_ID secret (system secret, auto-injected)
- [x] Wire DATABASE_URL secret (system secret, auto-injected)
- [x] Wire JWT_SECRET secret (system secret, auto-injected)
- [x] Wire STRIPE_SECRET_KEY secret (system secret, auto-injected)
- [x] Polish landing page: mobile nav (hamburger), scroll effect, hero animation, per-feature colors
- [x] Polish dashboard: Tenant Switcher in sidebar, improved branding
- [x] Loading skeletons already present on Products, Orders, Customers pages
- [x] Empty states already present on Products, Orders, Customers pages
- [x] Add Demo Data seed button in Settings page (seedDemo tRPC mutation)
- [x] Push to GitHub (ksksrbiz-arch/unifyone-platform) — via checkpoint sync
- [x] Run full test suite (15/15) and save checkpoint v1.4

## Phase 6 — Supabase Realtime + Onboarding Wizard
- [x] Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY secrets
- [x] Verify Supabase Realtime client activates with secrets present
- [x] Confirm live updates on Orders and Customers pages (RealtimeStatus shows green Live dot)
- [x] Build /setup onboarding wizard page (3-step: Store Details → Plan → Success)
- [x] Auto-generate store slug from user name on mount
- [x] Wire tenant.create mutation in setup wizard
- [x] Redirect from /setup to /dashboard after tenant creation
- [x] Add TenantGuard in App.tsx — tenantless users auto-redirected to /setup
- [x] Run full test suite (15/15) and save checkpoint

## Phase 7 — Live Payments: Stripe + PayPal + Shopify
- [x] Audit existing Stripe routes and webhook handler
- [x] Check PayPal MCP available tools
- [x] Check Shopify integration for checkout URL pattern
- [x] Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET secrets (live keys validated via curl)
- [x] Add PayPal order creation REST endpoint (/api/paypal/create-order)
- [x] Add PayPal order capture REST endpoint (/api/paypal/capture-order)
- [x] Add shopifyCheckoutUrl field to tenants schema + migration applied
- [x] Build unified /checkout page with payment rail selector (Stripe / PayPal / Shopify)
- [x] Add PayPal Smart Buttons on frontend (JS SDK loaded dynamically)
- [x] Add Shopify "Open Shopify Store" redirect button
- [x] Update Integrations page with payment rail status cards + Shopify checkout URL field
- [x] Add paymentMethod and paypalOrderId columns to orders table + migration applied
- [x] Run full test suite (18/18) and save checkpoint
