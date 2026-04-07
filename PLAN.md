# Build Out Plan: Cleanest & Most Profitable Execution

## Research Summary

The UnifyOne platform is a multi-tenant commerce SaaS with 56 routes, 70+ UI components, and a Cathedral-themed design system. Core commerce (products, orders, customers, payments) is production-ready. The opportunity for "cleanest and most profitable execution" lies in:

1. **Conversion optimization** — The landing page is beautiful but missing proven conversion elements (social proof counters, urgency, trust badges, clear value metrics)
2. **Revenue leaks** — Analytics dashboard is incomplete (top products & webhook data fetched but not rendered), pricing CTAs don't all connect to Stripe
3. **Onboarding friction** — Setup wizard works but doesn't guide users to first value moment
4. **Email/drip system** — Templates exist but the capture-to-conversion funnel needs tightening
5. **SEO gaps** — Blog posts exist but need structured data; sitemap plugin generates wrong routes vs actual routes
6. **Broken test** — auth.logout.test.ts fails (sameSite cookie mismatch)
7. **Dashboard polish** — Several pages have unused data, incomplete UI sections, or TODO markers
8. **Missing .env.example** — Makes contributor onboarding harder

## Work Units

### Unit 1: Landing Page Conversion Optimization
**Files:** `client/src/pages/Home.tsx`
**Change:** Add live metrics counter section (tenants, orders processed, integrations), improve CTA hierarchy with urgency copy, add trust badges (payment logos, security), ensure all pricing tier CTAs link to `/login?plan=<slug>` for signup-to-checkout flow. Add smooth scroll behavior for anchor links. Ensure email capture section has better copy and success state.

### Unit 2: Complete Analytics Dashboard
**Files:** `client/src/pages/Analytics.tsx`
**Change:** Wire the already-fetched `topProducts` and `webhookEvents` queries into the UI. Add a "Top Products" ranked list/table and a "Recent Webhook Events" activity log. Remove TODO comments. Add proper loading/empty states.

### Unit 3: Fix Failing Test + Add .env.example
**Files:** `server/auth.logout.test.ts`, `.env.example` (new)
**Change:** Fix the sameSite cookie assertion (should expect 'lax' based on current cookie logic). Create `.env.example` with all required environment variables documented from `server/_core/env.ts`.

### Unit 4: Onboarding Flow Enhancement
**Files:** `client/src/pages/TenantSetup.tsx`
**Change:** Enhance the 3-step setup wizard: add progress indicators, add sample data seeding option in step 3 ("Start with demo products"), add a checklist/next-steps panel after setup completes that guides users to add their first product, connect a payment method, and customize their store. Link each step to the relevant dashboard page.

### Unit 5: SEO & Sitemap Alignment
**Files:** `vite-plugin-sitemap.js`, `client/public/sitemap.xml`, `client/public/robots.txt`
**Change:** Update the sitemap plugin route list to match the actual public routes (/, /architecture, /the-system, /manus-ai, /tithes, /blog/*, /privacy, /terms, /themes, /docs-chat, /resources, /sovereign). Remove stale routes (/platform, /pricing, /cathedral-framework) that don't exist. Add lastmod dates. Ensure robots.txt disallow list covers all authenticated routes. Add JSON-LD BreadcrumbList to blog posts.

### Unit 6: Blog & Content Pages Structured Data
**Files:** `client/src/pages/blog/GigEcommercePost.tsx`, `client/src/pages/blog/MultiTenantPost.tsx`, `client/src/pages/blog/ManusAIPost.tsx`
**Change:** Add `<Helmet>` with page-specific meta tags (title, description, og:tags) and JSON-LD Article structured data to each blog post. Add canonical URLs. Add author info, publish dates, and reading time estimates. Add "Back to Blog" navigation and related posts links between the three posts.

### Unit 7: Dashboard Revenue & Subscription Polish
**Files:** `client/src/pages/Settings.tsx`, `client/src/pages/Billing.tsx`
**Change:** In Settings, ensure plan upgrade buttons create real Stripe checkout sessions (verify the mutation is wired correctly). In Billing, add a clear "Current Plan" summary card at the top with usage vs limits (products used/max, orders used/max), trial days remaining with visual countdown, and a prominent upgrade CTA for free-tier users. Add invoice download links.

### Unit 8: Notification & Email Capture Funnel
**Files:** `client/src/pages/Notifications.tsx`, `client/src/components/AnnouncementBanner.tsx`, `client/src/pages/Home.tsx` (email section only)
**Change:** Polish the notification center with better empty states, group notifications by date, add "mark all read" button prominently. Ensure AnnouncementBanner renders correctly and is dismissible. On the landing page email capture, add inline validation, a privacy note, and a compelling value prop ("Get the Cathedral Blueprint — free").

### Unit 9: Video Production Page & Docs Completeness
**Files:** `client/src/pages/VideoProduction.tsx`, `client/src/pages/Documents.tsx`, `client/src/pages/docs/CaseStudies.tsx`, `client/src/pages/docs/IntegrationGuides.tsx`
**Change:** In VideoProduction, render the `_showcases` data that exists but isn't displayed (remove the TODO). In Documents, add proper section cards with icons linking to each doc sub-page. In CaseStudies and IntegrationGuides, add at least skeleton content structure with compelling headers and placeholder sections that demonstrate the platform's value.

### Unit 10: Products & Orders Page Polish
**Files:** `client/src/pages/Products.tsx`, `client/src/pages/Orders.tsx`
**Change:** Add bulk action support (select multiple → archive/delete). Add export-to-CSV button for orders list. Improve the product form with image URL preview. Add order timeline/activity log in the order detail view. Ensure consistent loading skeletons and empty state messaging across both pages.

## E2E Test Recipe

**Skip e2e** — This is a UI/content polish project across many pages. Each unit should:
1. Run `pnpm check` (TypeScript type checking)
2. Run `pnpm test` (unit tests — ensure no regressions)
3. Run `pnpm build` (verify production build succeeds)

No browser-based e2e is available in this repo (no Playwright/Cypress/etc).

## Worker Instructions Template

See the spawn phase for the complete prompt given to each worker.
