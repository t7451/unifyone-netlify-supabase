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

## Phase 8 — CVE Patches + Subscription System Hardening + UX Enhancements
- [x] Patch Dependabot CVEs: tRPC 11.6→11.11, axios 1.12→1.13.6, fast-xml-parser override >=5.3.6, rollup override >=4.59.0, tar override >=7.5.8
- [x] Upgrade pnpm to 10.27.0 (fixes 3 High CVEs: lockfile bypass, lifecycle scripts bypass, command injection)
- [x] 0 High/Critical CVEs remaining (only moderate dev-tool CVEs remain)
- [x] Harden Stripe webhook: syncSubscription() syncs status+periodEnd+planId on all subscription events
- [x] Wire Stripe webhook: invoice.payment_failed → set subscriptionStatus=past_due
- [x] Wire Stripe webhook: invoice.payment_succeeded → re-sync subscription
- [x] Add /api/stripe/invoices/:customerId endpoint for billing history
- [x] Add /api/stripe/subscription/:subscriptionId endpoint
- [x] Build subscriptionRouter with getStatus (plan+usage+trial) and getInvoices procedures
- [x] Build SubscriptionWidget component: status badge, trial countdown banner, usage meters (products/orders/users), upgrade CTA
- [x] Inject SubscriptionWidget into DashboardLayout sidebar (above footer, hidden when collapsed)
- [x] Build /billing page: current plan card, period end, Stripe portal button, invoice history with PDF download
- [x] Add Billing route to App.tsx and Billing link to sidebar nav
- [x] Run full test suite (21/21) and save checkpoint

## Phase 9 — Copilot Bots + Pay Now + Team Invites + v1.7.0 Release
- [x] Create .github/copilot-instructions.md with UnifyOne codebase context
- [x] Create .github/workflows/claude-review.yml — Claude Haiku PR code review bot
- [x] Create .github/workflows/dependency-audit.yml — weekly pnpm audit + auto-PR
- [x] Create .github/workflows/test-ci.yml — run vitest on every push/PR
- [x] Add Pay Now button to Orders table for unpaid orders
- [x] Wire /checkout?orderId=X pre-fill (amount + description from order)
- [x] Auto-mark order as paid on PayPal/Stripe capture success
- [x] Add team_invites table to schema + migration applied
- [x] Add /team page: member list, role management, invite flow, pending invites, copy link
- [x] Add teamRouter: invite/revoke/accept/listMembers/updateMemberRole/removeMember procedures
- [x] Add Team link to DashboardLayout sidebar nav
- [x] Create GitHub v1.7.0 release tag — https://github.com/ksksrbiz-arch/unifyone-netlify-supabase/releases/tag/v1.7.0
- [x] Run full test suite (21/21) and save checkpoint

## Phase 10 — Social Media Suite + Promote & Earn + Ecosystem [COMPLETE]
- [x] Add social_posts table (platform, content, status, scheduledAt, publishedAt, metrics)
- [x] Add social_accounts table (platform, accessToken, handle, tenantId)
- [x] Add referrals table (referrerId, referredEmail, status, creditsAwarded)
- [x] Add credit_transactions table (userId, amount, type, description, balanceAfter)
- [x] Add creditBalance field to users table
- [x] Run all schema migrations
- [x] Build socialRouter: createPost, listPosts, schedulePost, getMetrics, aiCompose procedures
- [x] Build referralRouter: generateLink, trackClick, listReferrals, getBalance procedures
- [x] Build /social page: AI post composer, platform selector, content calendar, post list
- [x] Build /referrals page: Promote & Earn hub, shareable templates, credit wallet, leaderboard
- [x] Add Social and Referrals links to DashboardLayout sidebar
- [x] Add robots.txt and sitemap.xml to client/public
- [x] Add /privacy and /terms pages from uploaded HTML files
- [x] Add Privacy Policy and Terms links to landing page footer
- [x] Run full test suite (21/21) and save checkpoint

## Phase 11 — n8n/Zapier/Mailchimp + Leads Pipeline + Stripe Checkout + Landing Animation [COMPLETE]
- [x] Add leads table (company, contact, email, phone, plan, platforms, branding, status, notes, createdAt)
- [x] Add n8n_workflows table (name, triggerEvent, webhookUrl, payload, enabled, lastTriggeredAt)
- [x] Add zapier_hooks table (name, triggerEvent, webhookUrl, enabled)
- [x] Add mailchimp_config table (apiKey, listId, enabled, tagPrefix)
- [x] Run all schema migrations (4 tables applied)
- [x] Build leadsRouter: submit (public), list (admin), updateStatus, addNote, getStats procedures
- [x] Build automationRouter: n8n CRUD, Zapier CRUD, Mailchimp config, test-trigger procedures
- [x] Wire leads.submit to persist lead + fire owner notification + trigger n8n/Zapier webhooks
- [x] Build admin /leads page: kanban status board (New→Contacted→Qualified→Converted→Lost), lead detail panel
- [x] Build /automations page: n8n workflow builder, Zapier hook manager, Mailchimp config
- [x] Add Leads and Automations links to DashboardLayout sidebar (admin-gated)
- [x] Activate Stripe checkout on Pricing page: monthly/yearly toggle, real createCheckout mutation
- [x] n8n webhook fires on lead.submitted event (fireAutomations() already wired)
- [x] Add AutomationFlowAnimation component: 6-step live pipeline demo with event stream log
- [x] Inject animation between Integrations and Pricing sections on landing page
- [x] Run full test suite (21/21) and save checkpoint

## Phase 12 — SEO Fixes + Full 4-Tier Notification System
- [ ] Fix page title: 30-60 chars, keyword-rich
- [ ] Add meta keywords, description, Open Graph, Twitter Card, canonical tags
- [ ] Add notifications table (userId, tenantId, type, title, body, read, link, createdAt)
- [ ] Add announcements table (adminId, title, body, type, startsAt, endsAt, dismissible)
- [ ] Add notification_dismissals table (userId, announcementId)
- [ ] Build notificationRouter: list, markRead, markAllRead, create (admin), broadcast
- [ ] Build announcementRouter: create, list active, dismiss
- [ ] Build in-app notification center: bell icon in DashboardLayout header with unread badge
- [ ] Build notification dropdown: real-time list, mark-as-read, empty state, link navigation
- [ ] Build admin announcement composer: title, body, type (banner/toast/modal), schedule, duration
- [ ] Show active announcements as dismissible banners at top of dashboard
- [ ] Build custom owner alert composer in Settings: send on-demand push notification
- [ ] Build webhook/email trigger configurator: per-event toggles for n8n/Mailchimp/Slack
- [ ] Run full test suite and save checkpoint

## Phase 12 — Completed Items (Notification System)
- [x] Notification tables schema + migration (notifications, announcements, notification_dismissals, notification_triggers)
- [x] notificationsRouter: list, unreadCount, markRead, markAllRead, delete, sendToUser, broadcastToTenant
- [x] notificationsRouter: createAnnouncement, listAnnouncements, listAllAnnouncements, toggleAnnouncement, deleteAnnouncement, dismissAnnouncement
- [x] notificationsRouter: listTriggers, upsertTrigger, deleteTrigger
- [x] NotificationCenter bell icon component with unread badge (dropdown)
- [x] AnnouncementBanner component (dismissible banners per severity)
- [x] AdminAnnouncementComposer component (create/toggle/delete announcements)
- [x] /notifications page with 4 tabs: Inbox, Broadcast (admin), Announcements (admin), Triggers
- [x] Bell icon added to DashboardLayout header (desktop + mobile)
- [x] /notifications route registered in App.tsx + sidebar nav item
- [x] SEO: title, meta description, keywords, OG tags, Twitter Card, JSON-LD, canonical URL already in place
- [x] SEO fix: title expanded from 29 → 43 chars ("UnifyOne — Multi-Tenant Commerce Platform") — within 30-60 target
- [x] SEO fix: keywords trimmed from 13 → 6 focused terms — within 3-8 target
- [x] Notification tests: 15 tests passing (all 4 tiers)

## Phase 13 — Custom UnifyOne Branded Login + Theme Store Marketplace [COMPLETE]
- [x] Custom /login page with UnifyOne branding (no Manus OAuth UI visible)
- [x] Auth bridge: intercept Manus OAuth redirect, show UnifyOne-branded loading/transition screen (/auth/callback)
- [x] Remove all Manus badge/logo/branding from auth-facing UI and redirect flows
- [x] Custom branded loading screen during OAuth callback
- [x] getLoginUrl() rerouted to /login — all login CTAs go through branded page
- [x] Theme Store DB schema: themes, theme_categories, theme_installs, theme_reviews tables + migrations applied
- [x] Theme Store tRPC router: list, get, search, filter, installFree, createCheckout, admin CRUD, review moderation
- [x] Theme Store frontend: /themes browse page (grid layout, category filters, price filter, search, sort)
- [x] Theme Store frontend: theme detail modal (screenshots, features, tech stack, pricing, install/purchase CTA)
- [x] Theme Store frontend: free install flow (one-click install, instant access)
- [x] Theme Store frontend: paid checkout via Stripe (one-time + subscription modes, opens in new tab)
- [x] Theme Store admin: /admin/themes upload page (metadata form, price management, status toggle)
- [x] Theme Store admin: price management (free / paid / subscription tier + Stripe Price ID)
- [x] Theme Store admin: review moderation panel (approve/reject reviews)
- [x] /my-themes installed themes page in dashboard
- [x] Stripe webhook fulfillment: checkout.session.completed → theme install record + installCount increment
- [x] Theme Store sidebar nav items (Theme Store + My Themes) + routes in App.tsx
- [x] Theme Store tests: 23 tests passing (helpers, filter logic, slug generation, pricing validation)

## Phase 14 — Meta Ads/CAPI + Rewards Keys + Revenue Streams + Affiliate Hub

- [ ] Rewards Keys DB schema: reward_opportunities, reward_claims tables + migration
- [ ] Meta CAPI DB schema: meta_pixel_events log table + migration
- [ ] Rewards Keys tRPC router: balance, opportunities, claim, credit history
- [ ] Meta CAPI server helper (capi.ts): sendCAPIEvent, hashed userData, deduplication
- [ ] Meta CAPI tRPC relay procedure: generic event relay + RewardsKeyEarned + Purchase
- [ ] Rewards Keys dashboard page (/rewards): balance widget, opportunities list, claim flow
- [ ] Revenue Streams page (/revenue-streams): multi-type stream tracker (affiliate/SaaS/consulting/physical/digital/passive)
- [ ] Affiliate Hub page (/affiliates): program manager with commission tracking, copy link, toggle active
- [ ] Meta Pixel script injection in index.html (VITE_META_PIXEL_ID env)
- [ ] Client-side pixel.ts helper: trackPixelEvent, typed convenience helpers
- [ ] n8n workflow JSON files added to /public/n8n/ for import reference
- [ ] Netlify build fix: remove base = "main" from netlify.toml
- [ ] Sidebar nav items: Rewards, Revenue Streams, Affiliates
- [ ] Tests for rewards router and CAPI helper

## Phase 14 — Meta Ads/CAPI + Rewards Keys + Revenue Streams + Affiliate Hub [COMPLETE]
- [x] DB schema: rewards_keys, credit_transactions, meta_capi_events, revenue_streams, affiliate_programs tables + migrations applied
- [x] Rewards Keys tRPC router: balance, opportunities, claim, history, adminCredit, adminCreateOpportunity
- [x] Meta CAPI server helper (server/meta/capi.ts): SHA-256 hashing, event relay to Meta Graph API v19.0
- [x] Meta CAPI tRPC router: relayEvent procedure with DB logging and deduplication via eventId
- [x] Rewards Keys dashboard page (/rewards): balance widget, opportunities list, claim flow, credit history
- [x] Revenue Streams tRPC router: list, create, update, delete, getSummary
- [x] Revenue Streams page (/revenue-streams): type breakdown, monthly totals, CRUD with status tracking
- [x] Affiliates tRPC router: list, create, update, delete, getSummary
- [x] Affiliate Hub page (/affiliates): commission tracking, pending payouts, instant payout flag, cookie duration
- [x] Meta Pixel base code injected in index.html (fires only when VITE_META_PIXEL_ID env var is set)
- [x] Client-side pixel.ts helper: track, trackCustom, pageView, lead, purchase, viewContent, addToCart, initiateCheckout, rewardsKeyEarned + fbp/fbc cookie readers
- [x] n8n workflow: meta-capi-relay.json (webhook → validate → Meta CAPI → respond)
- [x] n8n workflow: rewards-auto-credit.json (Stripe webhook → filter → extract → credit API → respond)
- [x] All 3 new pages registered in App.tsx with DashboardRoute protection
- [x] Sidebar nav items added: Rewards Keys, Revenue Streams, Affiliate Hub
- [x] 59 tests passing, 0 TypeScript errors

## SEO Fixes (ongoing)
- [x] Fix runtime document.title on / — scanner reads 8 chars instead of 43 (set via useEffect in Home.tsx)

## Phase 15 — Meta Pixel Activation + Full Mobile Optimization
- [ ] Add VITE_META_PIXEL_ID secret
- [ ] Add META_CAPI_ACCESS_TOKEN secret
- [ ] Fix animation layout push — CTA buttons jump when AutomationFlowAnimation loads
- [ ] Mobile hero: fix font sizes, button stacking, breathing room below nav
- [ ] Mobile nav: hamburger menu refinement, tap targets >= 44px
- [ ] Mobile sections: Features, How It Works, Pricing — single column, readable typography
- [ ] Fix animation section min-height so it doesn't push CTA off screen on mobile
- [ ] Enrich landing page copy: clearer value prop, feature explanations, social proof
- [ ] Add "How It Works" visual steps section (3-step: Connect → Unify → Scale)
- [ ] Add testimonials/social proof section
- [ ] Optimize Pricing section for mobile (card stack, toggle accessible)
- [ ] Add sticky mobile CTA bar at bottom of viewport

## Phase 15 — Mobile Optimization + OG Image + Visual Enhancement [COMPLETE]
- [x] Generated branded 1200x630 OG social share image (CDN hosted, replaces blank FB preview)
- [x] Generated hero visual for landing page (CDN hosted, 2-col hero layout)
- [x] Wired OG image into og:image and twitter:image meta tags (real CDN URL, not placeholder)
- [x] Fixed animation layout push — hero uses 2-col grid, animation in its own section with no CTA overlap
- [x] Full mobile optimization: 44px min touch targets, px-4 gutters, responsive typography (sm: breakpoints)
- [x] Added sticky mobile CTA bar (Start Free Trial + Sign In) fixed at bottom on mobile only
- [x] Added How It Works section (3 steps: Connect → Unify → Scale, with arrow connectors)
- [x] Added Testimonials section with 3 social proof cards and star ratings
- [x] Expanded integrations grid from 4 to 8 (added PayPal, Zapier, Mailchimp, Meta)
- [x] Enriched hero copy: 2-column layout with hero visual image on desktop
- [x] Enriched all 8 feature descriptions with specific operational details
- [x] Added trust signals under CTAs: "No credit card required · 14-day free trial · Cancel anytime"
- [x] Added How It Works nav link in desktop nav and mobile menu
- [x] Mobile menu items have 44px min-height and ChevronRight indicators for discoverability
- [x] Footer enhanced with Contact link and responsive flex-wrap for mobile
- [x] Pricing section: added "All plans include 14-day free trial" trust line

## Phase 16 — Shopify OAuth Multi-Merchant + Sync Monitoring Dashboard
- [ ] Add shopify_stores table (tenantId, shopDomain, accessToken, scopes, installedAt, status)
- [ ] Add shopify_sync_log table (storeId, event, entity, entityId, status, latencyMs, errorMsg, createdAt)
- [ ] Add shopify_api_quota table (storeId, callsMade, callsLimit, graphqlPoints, graphqlLimit, recordedAt)
- [ ] Run schema migrations
- [ ] Build Shopify OAuth install route (/api/shopify/install) — redirects to Shopify OAuth consent screen
- [ ] Build Shopify OAuth callback route (/api/shopify/callback) — exchanges code for access token, saves to DB
- [ ] Build shopifyStoresRouter: listStores, getStore, removeStore, syncNow, getScopes procedures
- [ ] Build syncMonitorRouter: getSyncStats, getAuditLog, getQuotaUtilization, getLatencyChart procedures
- [ ] Build /shopify/install page — merchant enters shop domain, initiates OAuth
- [ ] Build /shopify/success page — post-install confirmation with scope summary
- [ ] Build multi-merchant store switcher component in Integrations page
- [ ] Build /sync-monitor page — KPI cards (latency, error rate, quota %), audit log table, latency chart
- [ ] Add Sync Monitor nav link to DashboardLayout sidebar
- [ ] Wire all new routes in App.tsx
- [ ] Run tests and save checkpoint

## Phase 16 — Shopify OAuth Multi-Merchant + Sync Monitor [COMPLETE]
- [x] Schema: shopify_stores, shopify_sync_log, shopify_api_quota tables + migration applied
- [x] Server: registerShopifyRoutes() — /api/shopify/install (OAuth initiation with HMAC+CSRF), /api/shopify/callback (token exchange + store upsert), /api/shopify/webhook (HMAC-verified event ingestion + sync log)
- [x] logSyncEvent() helper — writes to shopify_sync_log from any server context
- [x] tRPC: shopifyStoresRouter — listStores, getStore, removeStore, syncNow, getScopes, linkToUser (admin)
- [x] tRPC: syncMonitorRouter — getSyncStats, getAuditLog, getQuotaUtilization, getLatencyChart, getStoreHealth
- [x] Frontend: /shopify/install — branded OAuth install page with domain input, scope preview, trust signals
- [x] Frontend: /shopify/success — post-install success page with next-step cards (Products, Orders, Sync Monitor)
- [x] Frontend: /sync-monitor — full dashboard: KPI cards (total events, success rate, error rate, avg latency), latency LineChart, event volume BarChart, store health grid, paginated audit log with entity/status filters
- [x] DashboardLayout: Sync Monitor + Connect Shopify nav items added (Activity + Plug icons)
- [x] App.tsx: /shopify/install, /shopify/success, /sync-monitor routes registered
- [x] 59 tests passing, 0 TypeScript errors

## Phase 17 — Revenue Sprint: /sovereign Waitlist + Social Launch
- [ ] Build /sovereign waitlist landing page (Cathedral Principle copy, lead capture, Stripe waitlist)
- [ ] Add sovereign_waitlist table to schema + migration
- [ ] Add sovereignRouter: joinWaitlist (public), listWaitlist (admin) procedures
- [ ] Wire /sovereign route in App.tsx (public, no auth required)
- [ ] Wire Shopify Partner API key (SHOPIFY_PARTNER_API_KEY, SHOPIFY_PARTNER_ID)
- [ ] Schedule 9 content calendar posts via n8n workflow
- [ ] Produce 7-day revenue sprint document with post copy, video teleprompter, and action plan
- [ ] Save checkpoint and push to GitHub

## Phase 17 — Revenue Sprint: /sovereign Waitlist + Social Launch [COMPLETE]
- [x] sovereign_waitlist DB table (position, tier, challenge, utmSource/Medium/Campaign, status) + migration applied
- [x] sovereignRouter: joinWaitlist (public, UTM tracking, position counter, owner notification), getCount (public social proof), listWaitlist (admin), updateStatus (admin)
- [x] /sovereign landing page: Cathedral Principle architecture diagram, Sovereign Tech Stack grid, What You Get pricing section, testimonials, waitlist form with revenue tier + challenge fields, UTM param capture
- [x] /sovereign route registered in App.tsx (public, no auth required)
- [x] n8n-workflows/social-media-scheduler.json: 9 Day 1 viral posts (LinkedIn x3, Facebook x2, Twitter x3, Instagram x1) with scheduling logic and owner notification
- [x] 7-day revenue sprint document written (unifyone-revenue-sprint.md): Netlify fix, video teleprompter script, email template, Shopify App Store submission steps, sales conversation scripts, referral activation, revenue projection
- [x] Shopify Partner API key usage documented (prtapi vs atkn vs OAuth app credentials)
