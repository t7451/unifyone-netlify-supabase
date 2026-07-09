# Monetization runbook — free tools & content

This documents the monetization layer added in `feat/monetize-free-tools`. It
turns the existing high-intent traffic (the free `/tools/*` calculators and
gig-tax content) into three revenue streams that ship safely today and start
earning the moment you paste your accounts in. Nothing here changes the app's
core UX or requires login to work.

## What shipped

| Piece | File | What it does |
|-------|------|--------------|
| Email capture on every tool | `client/src/components/ToolEmailCapture.tsx` | Compact opt-in wired into `ToolLayout`, tagged per-tool. Reuses the existing public `leads.submit` tRPC mutation — no new backend. |
| Partner/affiliate offers | `client/src/content/partnerOffers.ts`, `client/src/components/PartnerOffers.tsx` | Contextual, disclosed affiliate cards matched to each tool (tax software, mileage, banking, gas, insurance). |
| Display ad slots | `client/src/components/AdSlot.tsx` | Mount points for an ad network. No-op until `VITE_ADS_ENABLED=true`. |
| Comparison post | `client/src/pages/BestMileageApps.tsx` at `/best-mileage-tracking-apps` | "Best Mileage Tracking Apps 2026" — affiliate links + email capture + SEO/FAQ schema. |

## Why this order (biggest ROI first)

1. **Email capture is the highest-value change.** The tools previously captured
   zero emails. An owned list is worth more than any single-session monetization
   because you can market to it repeatedly (tax software in Jan–Apr, driver
   bonuses year-round, Pro upsell).
2. **Affiliate offers** monetize commercial intent directly on the page.
3. **Display ads** are passive but need a network approval first.

---

## Step 1 — Turn on email capture (already live)

Nothing to configure. Every `/tools/*` page now shows a capture form and writes
a lead via `leads.submit` with `source = "tool:<slug>"`. Leads appear in the
existing admin Leads view. To connect an email service provider (send the
promised guide/reminders automatically), wire the `leads.submit` service to
your ESP — a MailerLite MCP is available in this workspace.

## Step 2 — Add affiliate links

1. Sign up for the partner programs (see table below).
2. Put each tracking link in the matching `VITE_AFF_*` env var in Netlify →
   Site settings → Environment variables, then redeploy.
3. Until set, each CTA points to the partner's homepage (works, unmonetized).

| Env var | Partner | Where to apply |
|---------|---------|----------------|
| `VITE_AFF_TURBOTAX` | TurboTax Self-Employed | Intuit affiliate program (Impact/CJ) |
| `VITE_AFF_HRBLOCK` | H&R Block | H&R Block affiliate (CJ/Impact) |
| `VITE_AFF_EVERLANCE` | Everlance | Everlance partner/referral |
| `VITE_AFF_STRIDE` | Stride | Stride partner program |
| `VITE_AFF_FOUND` | Found (banking) | Found referral/affiliate |
| `VITE_AFF_NOVO` | Novo (banking) | Novo partner (Impact) |
| `VITE_AFF_UPSIDE` | Upside (gas cashback) | Upside referral |
| `VITE_AFF_STRIDE_HEALTH` | Stride Health (insurance) | Stride Health partner |

All outbound links render `rel="sponsored nofollow noopener"` and show an FTC
disclosure automatically — do not remove these.

## Step 3 — Display ads (when ready)

**Traffic reality check (verified 2026):**

- **Mediavine** no longer uses a flat "50,000 sessions" bar. The main network
  now requires roughly **$5,000 in trailing-12-month ad revenue**. Its
  **Journey by Mediavine** on-ramp starts at **1,000 monthly sessions** with no
  revenue minimum and a 70% revenue share, auto-upgrading once you hit $5k.
- **Ezoic** has **no minimum traffic** requirement — the realistic starting
  point at current volume (~50K pageviews/mo).
- **AdSense** also works with no traffic minimum but pays less.

**Recommendation:** apply to **Ezoic** (or Mediavine Journey) now; migrate to
full Mediavine/AdThrive once revenue qualifies.

To enable slots after approval:

1. Set `VITE_ADS_ENABLED=true` and `VITE_AD_NETWORK=ezoic` (or your network).
2. Add the network's site-wide script to `index.html` (or via their
   integration). Ezoic replaces `#ezoic-pub-ad-placeholder-<id>`; the `AdSlot`
   component already renders that id when `VITE_AD_NETWORK=ezoic`.
3. Redeploy. Slots appear below tool results and on the comparison page.

## Notes / follow-ups

- **IRS rate drift:** the 2026 IRS business mileage rate is **72.5¢/mile**
  (up from 70¢ in 2025). The comparison page uses 72.5¢, but
  `client/src/pages/tools/MileageCalculator.tsx` still hardcodes `0.7`. Update
  that constant for 2026 accuracy (separate change).
- Keep all copy educational, not tax/financial advice (YMYL).
