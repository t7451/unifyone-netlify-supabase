# apps/unifyone — Implementation TODO

Astro 4 marketing & waitlist site for `1commerce.online`.  
Stack: Astro 4 (hybrid) · React islands · Tailwind CSS 3 · Clerk auth · Neon Postgres (Drizzle ORM) · Netlify

---

## ✅ Completed

### Scaffold & Tooling
- [x] Astro 4 project with hybrid output mode
- [x] React islands via `@astrojs/react`
- [x] Tailwind CSS 3 with custom navy / teal / gold palette (`tailwind.config.mjs`)
- [x] MDX support via `@astrojs/mdx`
- [x] Clerk auth via `@clerk/astro`
- [x] Netlify adapter (`@astrojs/netlify`) + `netlify.toml`
- [x] Drizzle ORM + `drizzle-kit` configured (`drizzle.config.ts`)
- [x] `.env.example` for all required secrets
- [x] `@1commerce/seo` workspace package (JSON-LD, meta, sitemap utilities)

### Pages
- [x] `/` — Homepage (Hero, ValueProps, AudienceTabs, PricingTable, FAQ, WaitlistForm)
- [x] `/pricing` — Standalone pricing page with FAQ
- [x] `/gig-workers` — Audience landing page
- [x] `/freelancers` — Audience landing page
- [x] `/smb` — Audience landing page
- [x] `/developers` — Developer API landing with code sample
- [x] `/sign-in` — Clerk hosted sign-in
- [x] `/sign-up` — Clerk hosted sign-up
- [x] `/blog` — Blog index listing
- [x] `/blog/[...slug]` — Blog post detail with reading-time estimate

### Components
- [x] `Nav.astro` — Sticky top-bar with desktop links + sign-in / get-started CTAs
- [x] `Footer.astro` — 4-column footer (brand, product, audiences, account)
- [x] `Hero.astro` — Headline + dual CTA
- [x] `ValueProps.astro` — 3-column card grid
- [x] `AudienceTabs.astro` — `<details>` accordion of sample Kai prompts per audience
- [x] `PricingTable.astro` — 3-tier card grid (Starter / Pro / Scale)
- [x] `FAQ.astro` — Accordion FAQ, accepts optional `faqs` prop
- [x] `WaitlistForm.tsx` — React island with UTM capture, submit state, success/error feedback
- [x] `KaiDemoPlaceholder.tsx` — Placeholder for live Kai preview

### API Routes
- [x] `POST /api/waitlist` — Zod validation, email normalisation, Neon upsert, n8n webhook (fire-and-forget)
- [x] `POST /api/clerk-webhook` — Svix signature verification → user created/updated/deleted → Neon sync

### Database Schema
- [x] `users` — Clerk ID (PK), email, org_id, tier
- [x] `api_keys` — UUID PK, user FK, key_hash, prefix, last_used_at
- [x] `credit_ledger` — bigserial PK, user FK, delta, reason, ref_id + composite index
- [x] `waitlist` — email PK, source, utm JSONB, case-insensitive unique index

### SEO & Infrastructure
- [x] JSON-LD per page (Organization, WebSite, Article, FAQPage, BreadcrumbList)
- [x] Canonical URLs + OG meta via `buildMeta`
- [x] Custom `sitemap.xml.ts` endpoint (static + dynamic blog URLs) via `@1commerce/seo`
- [x] `robots.txt` → `/sitemap-index.xml`
- [x] Netlify security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- [x] `Base.astro` layout with safe JSON-LD serialisation (escapes `<`, U+2028, U+2029)

---

## 🔴 Critical / Blocking

### Fix Netlify build environment mismatch
- [ ] `netlify.toml` sets `NODE_VERSION = "20"` — upgrade to **22** (repo requires Node 22+)
- [ ] `netlify.toml` sets `PNPM_VERSION = "9"` — upgrade to **10** (repo uses pnpm 10)

### Remove duplicate sitemap integration
- [ ] `astro.config.mjs` includes `@astrojs/sitemap` integration **and** `src/pages/sitemap.xml.ts` both exist — the manual endpoint already handles blog posts correctly; **remove `sitemap` from `integrations`** in `astro.config.mjs` to avoid two competing sitemap files
- [ ] Update `robots.txt` `Sitemap:` directive to `/sitemap.xml` (not `/sitemap-index.xml`) once the integration is removed

### Bootstrap database migrations
- [ ] Run `pnpm --filter unifyone db:generate` to produce initial Drizzle migration files under `apps/unifyone/drizzle/`
- [ ] Verify `infra/neon/0001_init.sql` matches the Drizzle schema (or replace it by pointing README to `db:push`)
- [ ] Add the generated `drizzle/` folder to source control

### Add Inter font loading
- [ ] `tailwind.config.mjs` declares `fontFamily.sans = ["Inter", ...]` but `Base.astro` never loads the font — add a `<link>` to Google Fonts (or self-host via `fontsource`) in `Base.astro` `<head>`

---

## 🟡 High Priority

### Mobile navigation
- [ ] `Nav.astro` hides all nav links below `md` breakpoint (`hidden md:flex`) with no hamburger — add a mobile drawer / off-canvas menu (can be a lightweight Astro + `<details>` pattern or a React island)
- [ ] Add `aria-label="Primary navigation"` to the `<nav>` element
- [ ] Add a visible "Skip to main content" focus-visible link as the first child of `<body>`

### OG default image
- [ ] Create `/public/og-default.png` (1200×630) — currently referenced in `seo.ts` as `DEFAULT_OG_IMAGE` but the file does not exist, breaking OG previews on all pages that don't supply their own image
- [ ] Add a proper `<link rel="apple-touch-icon">` PNG (currently points to the SVG, which some iOS browsers reject)

### Custom 404 page
- [ ] Create `src/pages/404.astro` using the `Base` layout — currently Netlify returns a generic error page
- [ ] Add a `[[redirects]]` entry in `netlify.toml` (or an `_redirects` file) to serve the 404 page for all unmatched routes: `/* /404 404`

### Post-auth dashboard stub
- [ ] After Clerk sign-up / sign-in users are redirected to `/` which has no authenticated context — create `src/pages/dashboard/index.astro` as a `prerender = false` protected route that shows a minimal "You're logged in" state and links to upcoming features
- [ ] Add a `ClerkMiddleware`-based auth guard (`src/middleware.ts`) to redirect unauthenticated requests away from `/dashboard/**`

### Legal pages
- [ ] Create `src/pages/privacy.astro` — Privacy Policy (required before collecting waitlist emails in production)
- [ ] Create `src/pages/terms.astro` — Terms of Service
- [ ] Add Privacy / Terms links to `Footer.astro`

---

## 🟠 Medium Priority

### Stripe subscription checkout
- [ ] Add `stripe` dependency; wire up a `POST /api/checkout` server endpoint that creates a Stripe Checkout Session for the selected plan tier
- [ ] Replace `/sign-up` CTAs on `PricingTable.astro` with a plan-specific checkout link for Pro and Scale tiers
- [ ] Add `POST /api/stripe/webhook` endpoint (signature verification required) to sync subscription status back to `users.tier` in Neon
- [ ] Add `subscriptionStatus` and `stripeCustomerId` columns to the `users` schema

### Developer API key management
- [ ] Add `POST /api/keys` (create) and `DELETE /api/keys/:id` (revoke) server endpoints; hash key with bcrypt before storing in `api_keys`
- [ ] Create `src/pages/dashboard/api-keys.astro` UI for listing, creating, and revoking keys
- [ ] Return the plaintext key **once** on creation (never stored); show a copy-to-clipboard modal

### Credit ledger / usage dashboard
- [ ] Add `GET /api/credits` endpoint returning balance (sum of deltas) and last-N transactions for the authenticated user
- [ ] Create `src/pages/dashboard/usage.astro` showing current balance and a table of ledger entries

### Waitlist admin export
- [ ] Add `GET /api/admin/waitlist` (API-key-gated or Clerk admin-role-gated) that returns CSV of waitlist signups
- [ ] Optionally expose a simple `src/pages/admin/waitlist.astro` protected behind an admin role check

### Transactional email on waitlist signup
- [ ] Integrate Resend (or keep n8n as the transport) to send a "You're on the list" confirmation email immediately after a successful waitlist insert
- [ ] Use `WAITLIST_N8N_WEBHOOK_URL` (already env-guarded) or add `RESEND_API_KEY` to `.env.example`

### Live Kai demo / product preview
- [ ] Replace `KaiDemoPlaceholder.tsx` with an interactive chat mock (static pre-scripted Q&A) or an embedded video walkthrough to increase waitlist conversion
- [ ] Wire placeholder into the homepage (it is imported but not rendered — currently only `WaitlistForm` is used below the fold)

### Analytics / event tracking
- [ ] Add Plausible or Posthog snippet to `Base.astro` (privacy-friendly, no GDPR modal required for cookieless providers)
- [ ] Track waitlist form submit (`WaitlistForm.tsx`) as a conversion event

### Content-Security-Policy header
- [ ] Add `Content-Security-Policy` to the Netlify headers block in `netlify.toml`; minimum viable policy: `default-src 'self'; script-src 'self' 'unsafe-inline' clerk.com; style-src 'self' 'unsafe-inline'; img-src * data:; connect-src 'self' *.neon.tech *.clerk.com`

---

## 🟢 Low Priority / Polish

### Blog
- [ ] Add 2–3 more seed blog posts (product update, developer tutorial, use-case story)
- [ ] Add blog post `coverImage` support in `Base.astro` OG meta (already in schema, just needs a fallback to `DEFAULT_OG_IMAGE`)
- [ ] Add an RSS feed endpoint at `/blog/rss.xml`
- [ ] Add pagination to `/blog` index (once post count > 10)
- [ ] Style inline code blocks in blog posts with a proper syntax highlighter (Shiki via `@astrojs/mdx` is built-in)

### Accessibility
- [ ] Audit color-contrast ratios — `navy-100` text on `white` backgrounds may not meet WCAG AA
- [ ] Ensure all `<img>` tags have meaningful `alt` text (favicon images use `alt=""` correctly; verify blog cover images)
- [ ] Add `lang="en"` is already set; confirm `<html>` has correct locale for non-English blog posts

### Developer experience
- [ ] Add `vitest` and write unit tests for `POST /api/waitlist` (happy path, duplicate email, invalid body) and `POST /api/clerk-webhook` (signature failure, user.created, user.deleted)
- [ ] Add TypeScript path alias `@/*` → `src/*` in `tsconfig.json` (currently paths go through the bare `@/` alias which relies on Vite only; ensure `tsc` resolves it too)
- [ ] Add `pnpm --filter unifyone check` (tsc --noEmit) to CI workflow for this app
- [ ] Document local dev setup improvements: note that `pnpm --filter unifyone db:push` replaces the `psql` step mentioned in README

### SEO / metadata polish
- [ ] Verify `canonical` function handles trailing slashes consistently (currently `canonical("/")` → `https://1commerce.online/` but Astro may serve both `/` and with trailing slash)
- [ ] Add `<meta name="twitter:card" content="summary_large_image">` to `buildMeta` output in `@1commerce/seo`
- [ ] Verify Sitemap is submitted to Google Search Console once Netlify preview → production cutover is complete
- [ ] Add `hreflang` if internationalisation is planned

### Minor UX
- [ ] `PricingTable.astro` Scale tier CTA says "Talk to sales" but links to `/sign-up` — link to a contact/sales page or a mailto
- [ ] `AudienceTabs.astro` accordion uses `<details open>` on the first item (gig) — consider JavaScript-free tab switching that remembers which tab was active across navigation
- [ ] Add smooth-scroll offset for the `#waitlist` anchor link in the Hero to account for the sticky nav height

---

## 🔵 Future / Post-Launch

- [ ] **Platform connector OAuth flows** — Uber, DoorDash, Instacart, Shopify, Stripe Connect via a new `/connect/*` route group
- [ ] **Kai chat interface** — Authenticated `/dashboard/kai` page with SSE streaming from the API
- [ ] **`@unifyone/sdk` npm package** — TypeScript SDK promised on `/developers` page
- [ ] **Python + Go SDKs** — Listed on roadmap in `/developers` FAQ
- [ ] **SSO** — Clerk Organizations + SAML/OIDC for Scale tier (listed as "coming soon" in pricing)
- [ ] **Team seats** — Multi-user orgs; Clerk org membership + per-org credit pools
- [ ] **Tax export** — CSV/PDF export of earnings summary for accountants
- [ ] **Anomaly detection webhooks** — Described in `/developers`; requires event-bus + delivery infra
- [ ] **Mobile app** — React Native or Expo using the same Kai API

---

## Environment Variables Reference

| Variable | Required | Notes |
|---|---|---|
| `NEON_DATABASE_URL` | ✅ | Neon serverless Postgres connection string |
| `CLERK_SECRET_KEY` | ✅ | Clerk backend API key |
| `CLERK_WEBHOOK_SECRET` | ✅ | Svix secret for webhook signature verification |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk frontend publishable key |
| `PUBLIC_SITE_URL` | ✅ | Canonical origin (default: `https://1commerce.online`) |
| `WAITLIST_N8N_WEBHOOK_URL` | Optional | n8n automation trigger on new waitlist signup |
| `RESEND_API_KEY` | Future | Transactional email for waitlist confirmation |
| `STRIPE_SECRET_KEY` | Future | Stripe subscription checkout |
| `STRIPE_WEBHOOK_SECRET` | Future | Stripe webhook signature verification |
