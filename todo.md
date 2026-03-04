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
