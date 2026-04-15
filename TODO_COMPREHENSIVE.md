# UnifyOne — Comprehensive TODO & Audit Report

**Generated:** 2026-04-15  
**Repository:** t7451/unifyone-netlify-supabase  
**Current Status:** CI passing. Most items below have been completed. See individual checkboxes for current state.

---

## 🚨 CRITICAL FIXES (Immediate Action Required)

### CI/CD Pipeline Failures

- [x] **Fix pnpm version mismatch in GitHub Actions**
  - **Issue:** `.github/workflows/build.yml` specifies `version: 10` but `package.json` has `packageManager: "pnpm@10.27.0"`
  - **Error:** "Multiple versions of pnpm specified" causing all CI runs to fail
  - **Fix Applied:** Removed version override in workflow to use auto-detection from package.json
  - **Status:** Fixed in commit 92bbcee
  - **Next Step:** Monitor next workflow run to verify fix

### Code TODOs Found in Codebase

- [x] **VideoProduction.tsx** — `_showcases` data is fully rendered in the Showcase Library section ✅
- [x] **Analytics.tsx** — `topProducts` and `webhookEvents` are wired into the UI ✅
- [x] **auth.logout.test.ts** — `sameSite: "lax"` assertion already correct ✅
- [x] **Home.tsx EmailCapture** — Wired to `trpc.leads.submit` mutation (was a no-op placeholder) ✅
- [x] **documentChat.ts embedding** — Clarified comment; Voyage AI is the path for production embeddings ✅

---

## 📋 PHASE-BY-PHASE COMPLETION STATUS

### ✅ Completed Phases

- [x] **Phase 1-11:** Core platform (database, backend, frontend, integrations) — 100% complete
- [x] **Phase 12:** Notification system (4-tier) — 100% complete
- [x] **Phase 13:** Custom branded login + Theme Store — 100% complete
- [x] **Phase 14:** Meta Ads/CAPI + Rewards + Revenue Streams + Affiliates — 100% complete
- [x] **Phase 15:** Mobile optimization + OG images + Visual enhancements — 100% complete
- [x] **Phase 16:** Shopify OAuth multi-merchant + Sync Monitor — 100% complete
- [x] **Phase 17:** /sovereign waitlist + Social launch — 100% complete
- [x] **Phase 18:** Money Manager + Gamification — Mostly complete
- [x] **Phase 19:** Social Achievements (Friends, Feed, Challenges) — 100% complete
- [x] **Phase 21:** Mobile layout re-optimization — 100% complete
- [x] **Phase 22:** Gig Command Center — 100% complete
- [x] **Phase 25:** Manus AI Integration — 100% complete

### 🔄 In Progress / Partially Complete

#### Phase 4 — Dashboard Analytics & Customers CRUD
- [ ] Request Supabase Realtime secrets (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] Build Customers CRUD page with profile modal and order history
- [ ] Build real Dashboard page with KPI cards and recharts analytics
- [ ] Add Dashboard revenue chart (last 30 days)
- [ ] Add Dashboard top products widget
- [ ] Add Dashboard recent orders feed
- [ ] Run full test suite and save checkpoint
- **Note:** Some analytics exist but UI wiring incomplete per PLAN.md Unit 2

#### Phase 20 — Automated Challenge Completion Detection
- [ ] Schema: add resolvedAt, winnerNotified, loserNotified columns to friend_challenges + migration
- [ ] challengeCompletion.ts engine: checkAndResolveFriendChallenges(challengeId, userId) function
- [ ] Completion logic: compare challenger vs challengee progress when either hits goal
- [ ] Tie-break logic: first to complete wins; exact tie → both marked winner
- [ ] Winner notification: in-app "You Won!" with points awarded
- [ ] Loser notification: in-app "Challenge Complete — better luck next time"
- [ ] Bonus points: award extra points to winner on top of challenge reward
- [ ] Wire completion check into: gamification.joinChallenge, gamification progress updates
- [ ] Wire completion check into: moneyManager.endShift, moneyManager.logMileage
- [ ] Add socialFriends.getChallengeResults procedure
- [ ] Update /friends Challenges tab: show resolved challenges with winner badge
- [ ] Add completionRouter.checkAll admin procedure for manual re-scan
- [ ] Tests for completion engine (tie, winner, loser, already-resolved guard)

#### Phase 23 — Meta CAPI Event Loop + Mobile Automation Scheduling
- [ ] Audit existing Meta Pixel code and VITE_META_PIXEL_ID gap
- [ ] Add meta_capi_events table (eventName, userId, eventSourceUrl, userData, customData, sentAt, responseCode)
- [ ] capiRouter: fireLead, firePurchase, fireCompleteRegistration, fireCustomEvent, listEvents procedures
- [ ] Wire CAPI into: Stripe purchase, lead submit, rewards key claim, shift completed, friend challenge accepted
- [ ] Add VITE_META_PIXEL_ID secret
- [ ] Frontend Pixel helper: trackPixelEvent(eventName, params) using fbq()
- [ ] Wire frontend Pixel on: page views, checkout open, shift start
- [ ] Add n8n_schedules table
- [ ] mobileAutomationRouter: listSchedules, createSchedule, updateSchedule, deleteSchedule, triggerNow
- [ ] /mobile-automation page: n8n workflow scheduler with cron builder
- [ ] Tests for capiRouter and mobileAutomationRouter

#### Phase 41 — Strategic Asset Integration
- [x] Extract and catalog Operating Excellence Bundle
- [x] Create Resources/Templates page
- [x] Create Video Production showcase page
- [x] Create Ad Copy Hub page
- [ ] **Deploy integrated assets and verify all resources load correctly**

#### Phase 42 — Governance Dashboard
- [x] Create governance database schema
- [x] Build Governance Dashboard UI with audit logs viewer
- [x] Implement decision authority matrix
- [x] Add emergency kill-switch controls
- [x] Add /governance route (admin-only)
- [ ] **Implement tRPC procedures for audit logging and escalation handling**
- [ ] **Deploy governance dashboard and test end-to-end**

---

## 🎯 PRIORITY IMPROVEMENTS (From PLAN.md Analysis)

### Unit 1: Landing Page Conversion Optimization
**Files:** `client/src/pages/Home.tsx`
- [ ] Add live metrics counter section (tenants, orders processed, integrations)
- [ ] Improve CTA hierarchy with urgency copy
- [ ] Add trust badges (payment logos, security)
- [ ] Ensure all pricing tier CTAs link to `/login?plan=<slug>` for signup-to-checkout flow
- [ ] Add smooth scroll behavior for anchor links
- [ ] Improve email capture section copy and success state

### Unit 2: Complete Analytics Dashboard
**Files:** `client/src/pages/Analytics.tsx`
- [ ] Wire the already-fetched `topProducts` query into the UI
- [ ] Wire the already-fetched `webhookEvents` query into the UI
- [ ] Add a "Top Products" ranked list/table
- [ ] Add a "Recent Webhook Events" activity log
- [ ] Remove TODO comments
- [ ] Add proper loading/empty states

### Unit 3: Fix Failing Test + .env.example
**Files:** `server/auth.logout.test.ts`, `.env.example`
- [x] .env.example already exists (confirmed)
- [ ] Fix the sameSite cookie assertion (should expect 'lax' based on current cookie logic)
- [ ] Verify all required environment variables are documented in .env.example

### Unit 4: Onboarding Flow Enhancement
**Files:** `client/src/pages/TenantSetup.tsx`
- [ ] Add progress indicators to 3-step setup wizard
- [ ] Add sample data seeding option in step 3 ("Start with demo products")
- [ ] Add a checklist/next-steps panel after setup completes
- [ ] Guide users to add their first product, connect payment method, customize store
- [ ] Link each step to relevant dashboard page

### Unit 5: SEO & Sitemap Alignment
**Files:** `vite-plugin-sitemap.js`, `client/public/sitemap.xml`, `client/public/robots.txt`
- [ ] Update the sitemap plugin route list to match actual public routes
- [ ] Remove stale routes (/platform, /pricing, /cathedral-framework) that don't exist
- [ ] Add lastmod dates
- [ ] Ensure robots.txt disallow list covers all authenticated routes
- [ ] Add JSON-LD BreadcrumbList to blog posts

### Unit 6: Blog & Content Pages Structured Data
**Files:** Blog post pages
- [ ] Add `<Helmet>` with page-specific meta tags to each blog post
- [ ] Add JSON-LD Article structured data to each blog post
- [ ] Add canonical URLs
- [ ] Add author info, publish dates, and reading time estimates
- [ ] Add "Back to Blog" navigation and related posts links

### Unit 7: Dashboard Revenue & Subscription Polish
**Files:** `client/src/pages/Settings.tsx`, `client/src/pages/Billing.tsx`
- [ ] Ensure plan upgrade buttons create real Stripe checkout sessions
- [ ] Add clear "Current Plan" summary card at top
- [ ] Add usage vs limits (products used/max, orders used/max)
- [ ] Add trial days remaining with visual countdown
- [ ] Add prominent upgrade CTA for free-tier users
- [ ] Add invoice download links

### Unit 8: Notification & Email Capture Funnel
**Files:** `client/src/pages/Notifications.tsx`, `client/src/components/AnnouncementBanner.tsx`, `client/src/pages/Home.tsx`
- [ ] Polish notification center with better empty states
- [ ] Group notifications by date
- [ ] Add "mark all read" button prominently
- [ ] Ensure AnnouncementBanner renders correctly and is dismissible
- [ ] Add inline validation to landing page email capture
- [ ] Add privacy note
- [ ] Add compelling value prop ("Get the Cathedral Blueprint — free")

### Unit 9: Video Production Page & Docs Completeness
**Files:** `client/src/pages/VideoProduction.tsx`, `client/src/pages/Documents.tsx`, docs pages
- [ ] **Render the `_showcases` data that exists but isn't displayed (TODO on line 12)**
- [ ] In Documents, add proper section cards with icons linking to each doc sub-page
- [ ] In CaseStudies and IntegrationGuides, add skeleton content structure
- [ ] Add compelling headers and placeholder sections

### Unit 10: Products & Orders Page Polish
**Files:** `client/src/pages/Products.tsx`, `client/src/pages/Orders.tsx`
- [ ] Add bulk action support (select multiple → archive/delete)
- [ ] Add export-to-CSV button for orders list
- [ ] Improve product form with image URL preview
- [ ] Add order timeline/activity log in order detail view
- [ ] Ensure consistent loading skeletons and empty state messaging

---

## 🧪 TESTING & QUALITY

### Current Test Status
- **96-100 tests passing** (varies by phase)
- **0 TypeScript errors** (strict mode enabled)
- **Vitest** configured and running

### Testing Gaps
- [ ] E2E tests not implemented (no Playwright/Cypress)
- [ ] Some tests may need updates after auth.logout.test.ts fix
- [ ] Coverage reports not generated
- [ ] Mobile responsive testing is manual

### Recommended Actions
- [ ] Set up E2E testing framework (Playwright recommended)
- [ ] Add visual regression testing for UI components
- [ ] Set up test coverage reporting in CI
- [ ] Add performance testing for critical user flows

---

## 🔒 SECURITY & COMPLIANCE

### Environment Variables
- [x] .env.example exists and is up-to-date
- [ ] Audit all secrets are properly documented
- [ ] Verify no secrets committed to repository

### Security Scanning
- [x] CVE patches applied (Phase 8)
- [x] 0 High/Critical CVEs remaining
- [ ] Set up automated dependency scanning in CI
- [ ] Add CodeQL security scanning workflow

### Compliance
- [x] Privacy Policy and Terms pages exist
- [ ] GDPR compliance review needed
- [ ] Data retention policy documentation
- [ ] Security incident response plan

---

## 📦 INFRASTRUCTURE & DEPLOYMENT

### CI/CD
- [x] GitHub Actions workflows exist (.github/workflows/build.yml)
- [x] pnpm version mismatch fixed
- [ ] Add deployment preview for PRs
- [ ] Add automated rollback capability
- [ ] Set up staging environment

### Monitoring & Observability
- [x] Sentry integration exists (@sentry/node)
- [ ] Set up error alerting
- [ ] Add performance monitoring
- [ ] Set up logging aggregation
- [ ] Create status page

### Docker & Deployment
- [x] Dockerfile exists (Node 22 Alpine multi-stage)
- [x] docker-compose.yml configured
- [x] Netlify configuration (netlify.toml)
- [ ] Optimize Docker image size
- [ ] Add health check endpoints
- [ ] Document deployment procedures

---

## 📚 DOCUMENTATION

### Existing Documentation
- [x] CLAUDE.md — Claude Code instructions
- [x] DEPLOYMENT.md — Deployment documentation
- [x] DEPLOYMENT_INSTRUCTIONS.md — Detailed deployment steps
- [x] OPS_CHECKLIST.md — Operations checklist
- [x] PLAN.md — Build-out plan (10 units)
- [x] .github/copilot-instructions.md — Copilot context
- [x] docs/ folder with 7 markdown files

### Documentation Gaps
- [ ] API documentation (tRPC routes)
- [ ] Component library documentation (Storybook?)
- [ ] Database schema documentation
- [ ] Architecture decision records (ADRs)
- [ ] Runbook for common operations
- [ ] Troubleshooting guide
- [ ] Contributing guidelines
- [ ] Code style guide

---

## 🚀 PERFORMANCE OPTIMIZATION

### Frontend
- [ ] Implement code splitting for routes
- [ ] Optimize bundle size (currently unknown)
- [ ] Add lazy loading for images
- [ ] Implement virtual scrolling for large lists
- [ ] Add service worker for offline support
- [ ] Optimize Tailwind CSS purging

### Backend
- [ ] Add database query optimization
- [ ] Implement caching strategy (Redis?)
- [ ] Add rate limiting
- [ ] Optimize API response sizes
- [ ] Add database connection pooling
- [ ] Profile and optimize slow endpoints

---

## 🎨 UI/UX IMPROVEMENTS

### Design System
- [x] shadcn/ui components integrated
- [x] Tailwind CSS 4 with CSS variables
- [x] Dark theme support
- [ ] Accessibility audit (WCAG 2.1)
- [ ] Keyboard navigation improvements
- [ ] Screen reader testing
- [ ] Focus management

### Responsive Design
- [x] Mobile optimization completed (Phase 15, 21)
- [ ] Tablet optimization review
- [ ] Desktop wide-screen optimization
- [ ] Print styles for reports

### User Experience
- [ ] Add loading indicators for all async operations
- [ ] Improve error messages and recovery flows
- [ ] Add onboarding tooltips/tours
- [ ] Implement optimistic UI updates
- [ ] Add undo/redo functionality where appropriate
- [ ] Improve form validation feedback

---

## 📈 ANALYTICS & METRICS

### Current Implementation
- [x] Analytics dashboard exists
- [x] Event tracking schema (events table)
- [x] Meta Pixel integration (partial)
- [x] Plausible Analytics tracker

### Missing Analytics
- [ ] Complete Meta Pixel implementation (VITE_META_PIXEL_ID secret needed)
- [ ] Set up conversion tracking
- [ ] Add user behavior analytics
- [ ] Implement A/B testing framework
- [ ] Add product analytics (usage metrics)
- [ ] Set up revenue analytics dashboard

---

## 🔧 TECHNICAL DEBT

### Code Quality
- [ ] Refactor large components (>300 lines)
- [ ] Extract reusable hooks
- [ ] Reduce prop drilling (consider context or state management)
- [ ] Consolidate duplicate code
- [ ] Improve TypeScript types (reduce `any` usage)
- [ ] Add JSDoc comments to complex functions

### Dependencies
- [x] pnpm 10.27.0 (latest)
- [x] React 19.2.1
- [x] Node.js 22+
- [ ] Review and update outdated dependencies
- [ ] Remove unused dependencies
- [ ] Audit peer dependency warnings

### Build & Tooling
- [x] Vite 7.3.2
- [x] TypeScript 5.9.3
- [x] ESLint flat config
- [ ] Optimize build time
- [ ] Add bundle analysis
- [ ] Set up pre-commit hooks (Husky already configured)
- [ ] Add commit message linting

---

## 🌐 INTERNATIONALIZATION

- [ ] i18n framework setup (react-i18next?)
- [ ] Extract hardcoded strings
- [ ] Add language selector
- [ ] RTL support for Arabic/Hebrew
- [ ] Currency localization
- [ ] Date/time formatting by locale
- [ ] Number formatting by locale

---

## 🤝 THIRD-PARTY INTEGRATIONS

### Implemented
- [x] Stripe (payments, subscriptions)
- [x] PayPal (orders, subscriptions)
- [x] Shopify (OAuth, product sync, orders)
- [x] n8n (webhooks)
- [x] Supabase (realtime, partial)
- [x] AWS S3 (storage)
- [x] Meta (Pixel, CAPI partial)
- [x] Square (payments)
- [x] Plausible Analytics

### Planned/Incomplete
- [ ] Mailchimp (config exists, full implementation pending)
- [ ] Zapier (hooks exist, full implementation pending)
- [ ] Plaid (bank linking - MoneyGeneratorApp relay pending)
- [ ] Google Maps (Maps API integration for Gig Command)
- [ ] Twilio (SMS notifications)
- [ ] SendGrid/Resend (email)
- [ ] Slack (notifications)

---

## 📝 CONTENT & SEO

### SEO Status
- [x] Basic meta tags implemented
- [x] OG images created and deployed
- [x] robots.txt exists
- [x] sitemap.xml exists
- [ ] Verify sitemap accuracy (PLAN.md Unit 5)
- [ ] Add structured data to all pages
- [ ] Implement canonical URLs
- [ ] Add meta descriptions to all pages
- [ ] Optimize page titles (30-60 chars)

### Content Gaps
- [ ] Blog content expansion (3 posts exist)
- [ ] Case studies (skeleton only)
- [ ] Integration guides (skeleton only)
- [ ] Video tutorials
- [ ] Help documentation
- [ ] FAQ page
- [ ] Changelog/release notes

---

## 🎯 BUSINESS & GROWTH

### Revenue Optimization
- [ ] Implement upsell flows
- [ ] Add abandoned cart recovery
- [ ] Create trial expiration email sequence
- [ ] Add referral incentives
- [ ] Implement usage-based pricing
- [ ] Add enterprise tier features

### User Acquisition
- [ ] SEO optimization (ongoing)
- [ ] Content marketing strategy
- [ ] Social media integration (posts scheduled)
- [ ] Email drip campaigns
- [ ] Affiliate program activation
- [ ] Partner integrations

### Retention
- [ ] Onboarding flow improvements (PLAN.md Unit 4)
- [ ] Feature discovery prompts
- [ ] Usage analytics and insights
- [ ] Customer success automation
- [ ] Churn prevention workflows

---

## 🎮 GAMIFICATION & ENGAGEMENT

### Implemented
- [x] Points system
- [x] Achievements (12 seeded)
- [x] Challenges
- [x] Leaderboard
- [x] Friend system
- [x] Direct challenges

### Enhancements Needed
- [ ] Automated challenge completion (Phase 20)
- [ ] Seasonal events
- [ ] Team challenges
- [ ] Achievement categories
- [ ] Badge display customization
- [ ] Social sharing of achievements

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Current Status
- [x] JWT-based auth (cookie)
- [x] Manus OAuth integration
- [x] Custom branded login page
- [x] Role-based access control (admin/user)
- [x] Multi-tenancy isolation

### Improvements Needed
- [ ] Two-factor authentication (2FA)
- [ ] Social login options (Google, GitHub)
- [ ] Session management UI
- [ ] Password reset flow
- [ ] Email verification
- [ ] Account deletion flow
- [ ] Audit logging for auth events

---

## 📊 DATABASE & DATA

### Schema Status
- [x] 22 migrations applied
- [x] Multi-tenant architecture
- [x] Comprehensive schema (30+ tables)
- [ ] Add database indexes for performance
- [ ] Implement soft deletes where appropriate
- [ ] Add audit trails for sensitive tables
- [ ] Set up database backups
- [ ] Document data retention policies

### Data Management
- [ ] Add data export functionality
- [ ] Implement data import tools
- [ ] Add bulk operations
- [ ] Create data migration scripts
- [ ] Add data validation rules
- [ ] Implement data archival strategy

---

## 🚨 INCIDENT RESPONSE

- [ ] Create incident response plan
- [ ] Set up on-call rotation
- [ ] Document escalation procedures
- [ ] Create runbooks for common issues
- [ ] Set up incident communication channels
- [ ] Implement post-mortem process

---

## 📅 ROADMAP PRIORITIES

### High Priority (Next Sprint)
1. ~~**Fix CI/CD** — Monitor next workflow run after pnpm fix~~ ✅ Done
2. ~~**Complete Analytics Dashboard** — Wire topProducts and webhookEvents~~ ✅ Done
3. ~~**Render VideoProduction showcases** — Remove TODO on line 12~~ ✅ Done
4. ~~**Fix auth.logout.test.ts** — sameSite cookie assertion~~ ✅ Done
5. ~~**Implement Governance tRPC procedures** — Complete Phase 42~~ ✅ Done
6. ~~**Wire EmailCapture to leads.submit**~~ ✅ Done
7. **Wire Voyage AI embeddings** — Replace hash-based embedding in documentChat.ts with `voyage-3-large` model call when `VOYAGE_API_KEY` is available

### Medium Priority (2-4 Weeks)
1. **Automated Challenge Completion** — Phase 20 (backend engine + notifications)
2. **Meta CAPI Event Loop** — Phase 23 (meta_capi_events table + capiRouter)
3. **Mobile Automation Scheduling** — Phase 23 n8n_schedules table + scheduler UI

### Low Priority (Backlog)
1. **E2E Testing Framework** — Playwright setup
2. **i18n Implementation** — Multi-language support
3. **Performance Optimization** — Bundle size, code splitting
4. **Documentation Expansion** — API docs, runbooks
5. **Additional Integrations** — Mailchimp, Zapier completion

---

## 📞 SUPPORT & OPERATIONS

- [ ] Set up support ticket system
- [ ] Create customer knowledge base
- [ ] Implement in-app help widget
- [ ] Add live chat support
- [ ] Create support SLA definitions
- [ ] Set up customer feedback collection
- [ ] Implement NPS tracking

---

## 🎓 TRAINING & ONBOARDING

- [ ] Create developer onboarding guide
- [ ] Record video walkthroughs
- [ ] Set up local development guide
- [ ] Create testing guide
- [ ] Document common workflows
- [ ] Add code review checklist
- [ ] Create deployment guide

---

## ✅ NEXT IMMEDIATE ACTIONS

1. ~~**Monitor CI Fix** — Verify next GitHub Actions workflow run passes~~ ✅ Done
2. ~~**Fix VideoProduction TODO** — Render _showcases array in JSX~~ ✅ Done
3. ~~**Wire Analytics Dashboard** — Connect topProducts and webhookEvents to UI~~ ✅ Done
4. ~~**Fix Test** — Update auth.logout.test.ts sameSite cookie assertion~~ ✅ Done
5. ~~**Complete Governance** — Implement missing tRPC procedures~~ ✅ Done
6. ~~**Wire EmailCapture** — Connect Home.tsx email form to `trpc.leads.submit`~~ ✅ Done

**Remaining:** Wire Voyage AI embeddings in documentChat.ts for production-grade semantic search.

---

**End of Comprehensive TODO Report**

*This document consolidates findings from:*
- *CI workflow failure analysis*
- *Codebase TODO/FIXME/XXX/HACK search*
- *Existing todo.md (793 lines)*
- *PLAN.md (10 work units)*
- *Phase completion tracking*
