# UnifyOne Marketing Site

Next.js 15 + TypeScript + Tailwind + Framer Motion + Lucide.
Located in the `apps/marketing` workspace package (`@unifyone/marketing`).

## Quickstart

```bash
cd apps/marketing
cp .env.example .env.local
pnpm install   # from the repo root, or: pnpm --filter @unifyone/marketing install
pnpm --filter @unifyone/marketing dev    # http://localhost:3100
```

## Build

```bash
pnpm --filter @unifyone/marketing build
pnpm --filter @unifyone/marketing start
```

## Structure

```
app/                      # App Router pages (RSC by default)
  layout.tsx              # Global layout, fonts, metadata, OG, navbar, footer
  page.tsx                # Home
  pricing/                # Pricing + comparison table + FAQ
  features/               # Feature deep-dive + Kai highlight
  integrations/           # Integration logos grid
  solutions/              # Gig / e-com / agencies
  how-it-works/           # 4-step flow
  blog/                   # Blog index (placeholder posts) + lead magnet
  contact/                # Contact form
  sitemap.ts robots.ts
components/
  ui/                     # Button, Card, Section, Accordion, Badge
  layout/                 # Navbar, Footer
  marketing/              # Hero, DashboardPreview, TrustBar, Testimonials,
                          # HowItWorks, Benefits, FAQ, CtaBand, PricingGrid,
                          # IntegrationsGrid, FloatingCta, ContactForm
lib/                      # cn() + APP_URLS
```

## Conversion design notes

- Primary CTA: **Start Free — No Credit Card** (Acolyte tier, $0, 1 tenant).
- Secondary CTA: **Watch 60-Second Demo** (anchor `#demo`).
- Every CTA has `data-analytics-cta="…"` for GA4 + Microsoft Clarity events.
- Floating "Start Free" CTA appears after scrolling past the fold.
- Trust bar, testimonials, dashboard preview, and FAQ are deliberately placed
  high on Home to address the current site's biggest issues (jargon, weak
  proof, no clear "start here" path).

## TODOs / Replace before launch

- Real dashboard screenshots/video (search for `TODO:` comments).
- Real testimonials + logos with permissions.
- Wire `/api/contact` + `/api/lead` to Resend / n8n / HubSpot.
- Add GA4 + Microsoft Clarity via `next/script` once IDs are in env.
- Add OG image at `public/og-default.png` (1200×630).
- MDX/CMS pipeline for `/blog/[slug]`.

## Accessibility & performance

- WCAG 2.2 AA-targeted: skip link, focus rings, ARIA labels, color contrast.
- Mobile-first, container max-width 1280px.
- `prefers-reduced-motion` respected globally.
- `font-display: swap` via `next/font` (Inter).
- Images via `next/image` (add as you replace placeholders).
