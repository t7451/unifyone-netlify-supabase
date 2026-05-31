# UnifyOne Marketing Site — Deployment Guide

This document covers deploying the **new Next.js 15 marketing site** at
`apps/marketing/` as the **root domain** (`https://1commerce.online`) and
relocating the existing product app to `https://app.1commerce.online`.

---

## 🚀 Go-live in 5 minutes (automated path)

The repo ships with `.github/workflows/deploy-marketing.yml`, which deploys
this site to Vercel on every push to `main` (and creates a preview URL on
every PR). To activate it:

### 1. Create the Vercel project (one time)

1. Go to <https://vercel.com/new> → **Import Git Repository** → pick
   `t7451/unifyone-netlify-supabase`.
2. **Root Directory:** leave as repository root (the root `vercel.json`
   already targets `apps/marketing`).
3. **Framework Preset:** Next.js (auto-detected).
4. **Environment Variables** — add these in Project Settings → Environment
   Variables (Production + Preview):

   ```env
   NEXT_PUBLIC_APP_URL=https://app.1commerce.online
   NEXT_PUBLIC_SIGNUP_URL=https://app.1commerce.online/signup
   NEXT_PUBLIC_LOGIN_URL=https://app.1commerce.online/login
   NEXT_PUBLIC_DEMO_VIDEO_URL=        # optional, leave blank for placeholder
   NEXT_PUBLIC_GA4_ID=                # e.g. G-XXXXXXXXXX
   NEXT_PUBLIC_CLARITY_ID=            # e.g. abcdefghij
   ```
5. Click **Deploy**. You'll get a `*.vercel.app` URL — verify it looks right.

### 2. Wire up CI auto-deploy (one time)

In GitHub → **Settings → Secrets and variables → Actions → New repository
secret**, add three secrets:

| Secret              | Where to find it                                                                  |
| ------------------- | --------------------------------------------------------------------------------- |
| `VERCEL_TOKEN`      | <https://vercel.com/account/tokens> → Create Token (scope: full account)          |
| `VERCEL_ORG_ID`     | Vercel project → Settings → General → "Project ID" section shows the Team/Org ID  |
| `VERCEL_PROJECT_ID` | Vercel project → Settings → General → Project ID                                  |

Once these three secrets exist, every push to `main` ships to Vercel
production automatically. The workflow skips cleanly (no failure) if the
secrets are missing.

### 3. Cut DNS over to Vercel (do this **last**, after `app.1commerce.online` is live)

> ⚠️ **Pre-flight check before flipping apex DNS:**
> 1. Confirm `https://app.1commerce.online` loads the product app (set up
>    via a new Netlify domain alias on the existing site, or migrate the
>    product app to a fresh host pointing at the `app` CNAME).
> 2. Confirm the Vercel deployment of the marketing site renders cleanly at
>    its `*.vercel.app` URL.
> 3. Notify any active customers of a brief DNS-propagation window.

Then in **Cloudflare → DNS** (full records table in §2 below):

```
A     @     76.76.21.21              Proxied OFF  (Vercel anycast)
CNAME www   cname.vercel-dns.com.    Proxied OFF
CNAME app   <existing-netlify-host>  Proxied OFF
```

And in **Vercel → Project → Settings → Domains**: add `1commerce.online`
and `www.1commerce.online` (Vercel will issue Let's Encrypt certs
automatically within a few minutes).

---

DNS is managed via **Cloudflare**. Hosting target is **Vercel**.

---

## 0. Architecture after migration

| URL                               | What lives there                            | Hosting                                                |
| --------------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| `https://1commerce.online`        | New marketing site (`apps/marketing/`)      | **Vercel**                                             |
| `https://www.1commerce.online`    | 301 → `https://1commerce.online`            | Vercel                                                 |
| `https://app.1commerce.online`    | Existing product app (Express + React/Vite) | Existing host (Netlify / Render / your current target) |
| `https://status.1commerce.online` | Status page (already in footer)             | External                                               |

---

## 1. Vercel project setup (marketing site)

### 1a. Create the project

1. Go to [vercel.com/new](https://vercel.com/new) → **Import** the
   `t7451/unifyone-netlify-supabase` repository.
2. When prompted for **Root Directory**, leave it at the repo root.
3. Vercel will auto-detect Next.js. The repo-root `vercel.json` overrides:
   - `buildCommand`: `pnpm --filter @unifyone/marketing build`
   - `installCommand`: `pnpm install --frozen-lockfile`
   - `outputDirectory`: `apps/marketing/.next`
4. **Node version**: set to `22.x` in Vercel project settings → General.
5. **Package manager**: Vercel auto-detects pnpm via `pnpm-lock.yaml`. Confirm
   under Settings → General → "Install command".

### 1b. Environment variables (Vercel → Settings → Environment Variables)

Add for **Production + Preview**:

```
NEXT_PUBLIC_APP_URL=https://app.1commerce.online
NEXT_PUBLIC_SIGNUP_URL=https://app.1commerce.online/signup
NEXT_PUBLIC_LOGIN_URL=https://app.1commerce.online/login
NEXT_PUBLIC_DEMO_VIDEO_URL=        # paste YouTube/Loom embed URL when ready
NEXT_PUBLIC_GA4_ID=G-XXXXXXX
NEXT_PUBLIC_CLARITY_ID=xxxxxxxxxx
```

> Marketing site has **no server-side secrets**. All values are public
> (`NEXT_PUBLIC_*`). Anything sensitive (Stripe, DB, etc.) stays on the
> product app.

### 1c. First deploy

Push to `main` (or trigger via Vercel UI). You will get a default URL like
`unifyone.vercel.app` — use this for the production smoke test below before
flipping DNS.

---

## 2. Cloudflare DNS

You will:

- Point the **apex** (`1commerce.online`) at Vercel
- Point **`www`** at Vercel (301-redirected to apex by Vercel)
- Point **`app`** at the existing product app host
- Keep DNS **proxy OFF** (grey-cloud) for the records that Vercel terminates
  TLS on. Vercel issues its own certs. Proxied (orange-cloud) works only with
  Cloudflare Full (strict) + Vercel custom cert — easier to start unproxied.

### 2a. Records to create

Replace `existing-app-host.example.com` with wherever the product app currently
lives (Netlify, Render, Fly, etc).

| Type    | Name  | Content                           | Proxy |
| ------- | ----- | --------------------------------- | ----- |
| `A`     | `@`   | `76.76.21.21` (Vercel anycast)    | OFF   |
| `CNAME` | `www` | `cname.vercel-dns.com`            | OFF   |
| `CNAME` | `app` | `<existing-app-host.example.com>` | OFF   |

> If your existing app host already requires Cloudflare proxy ON, leave it
> proxied — only the records Vercel terminates need to be grey-cloud while
> you bootstrap. You can flip back to orange-cloud later (see §2c).

### 2b. Add the domain in Vercel

1. Vercel project → **Settings → Domains** → **Add Domain**.
2. Add `1commerce.online` → Vercel will detect Cloudflare and walk you through.
3. Add `www.1commerce.online` → Vercel auto-creates a 308 redirect to apex.
4. Wait for both to show "Valid Configuration ✅" (~1–5 min).

### 2c. Optional: re-enable Cloudflare proxy

After Vercel issues certs and the site loads cleanly on apex:

1. Cloudflare → SSL/TLS → set to **Full (strict)**.
2. Flip the `A @` and `CNAME www` records to **Proxied** (orange-cloud).
3. Disable any Cloudflare **Auto Minify** (Next.js already optimizes) and any
   **Rocket Loader** (it breaks Next’s hydration).
4. Add a Cloudflare Page Rule or Cache Rule to **bypass cache** for
   `/_next/data/*` and `/api/*` if you proxy.

---

## 3. Move the product app to `app.1commerce.online`

The existing product app is currently in this same repo (`client/`, `server/`).
The marketing site lives separately at `apps/marketing/`.

### 3a. Add the new hostname to the existing app host

Examples:

- **Netlify**: Site settings → Domain management → Add custom domain →
  `app.1commerce.online` → verify with the `CNAME app` from §2a.
- **Render / Fly / Railway**: add custom domain `app.1commerce.online` in the
  respective dashboard and follow their CNAME verification.

### 3b. Update product app config

Anywhere the product app currently assumes the apex domain:

| File / env                | Old                          | New                                                                                                                           |
| ------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_APP_URL` (server) | `https://1commerce.online`   | `https://app.1commerce.online`                                                                                                |
| OAuth redirect URIs       | `https://1commerce.online/*` | `https://app.1commerce.online/*`                                                                                              |
| Cookie `domain`           | `.1commerce.online`          | leave as `.1commerce.online` to allow future SSO between apex & app, OR scope to `app.1commerce.online` for tighter isolation |
| Stripe / PayPal webhooks  | apex URLs                    | `app.1commerce.online` equivalents                                                                                            |
| `VITE_*` URLs             | apex                         | `app.1commerce.online`                                                                                                        |

Update OAuth providers (Google, Manus, etc.) **before** flipping DNS, or users
will fail to log in for a few minutes.

### 3c. Test the product app on the new hostname BEFORE the marketing DNS swap

Hit `https://app.1commerce.online` and verify:

- Login flow works end-to-end
- Stripe checkout completes
- Webhooks deliver (`stripe events resend …`)
- No CORS errors in browser console

---

## 4. Update marketing CTAs (already done)

All "Log in", "Sign up", "Start Free", "Go to Dashboard" CTAs read from
`lib/utils.ts → APP_URLS`, which defaults to `https://app.1commerce.online`.
You only need to override via env vars if your app host changes.

```ts
// apps/marketing/lib/utils.ts
export const APP_URLS = {
  signup:
    process.env.NEXT_PUBLIC_SIGNUP_URL ?? "https://app.1commerce.online/signup",
  login:
    process.env.NEXT_PUBLIC_LOGIN_URL ?? "https://app.1commerce.online/login",
  app: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.1commerce.online",
};
```

In addition, `vercel.json` includes safety-net redirects so that if anyone
hits `/login`, `/signup`, `/dashboard`, or `/app/*` on the **marketing** apex,
they’re bounced to `app.1commerce.online`:

```jsonc
"redirects": [
  { "source": "/login",    "destination": "https://app.1commerce.online/login" },
  { "source": "/signup",   "destination": "https://app.1commerce.online/signup" },
  { "source": "/dashboard","destination": "https://app.1commerce.online/dashboard" },
  { "source": "/app/:path*","destination": "https://app.1commerce.online/:path*" }
]
```

---

## 5. Environment variable summary

### Marketing (Vercel)

| Variable                     | Required | Notes                                           |
| ---------------------------- | -------- | ----------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`        | yes      | `https://app.1commerce.online`                  |
| `NEXT_PUBLIC_SIGNUP_URL`     | yes      | `…/signup`                                      |
| `NEXT_PUBLIC_LOGIN_URL`      | yes      | `…/login`                                       |
| `NEXT_PUBLIC_DEMO_VIDEO_URL` | no       | YouTube/Loom embed URL; blank shows placeholder |
| `NEXT_PUBLIC_GA4_ID`         | optional | `G-XXXXXXX` — scripts only inject when set      |
| `NEXT_PUBLIC_CLARITY_ID`     | optional | Clarity project ID                              |

### Product app (existing host)

Update **`PUBLIC_APP_URL`** and any OAuth/redirect/cookie config to the new
`app.` hostname. All other env vars stay as-is.

---

## 6. Post-deployment checklist

Run through this immediately after the cutover.

### Functional

- [ ] `https://1commerce.online` loads the new marketing site
- [ ] `https://www.1commerce.online` redirects (308) to apex
- [ ] `https://app.1commerce.online` loads the product app
- [ ] `https://1commerce.online/login` → redirects to `app.1commerce.online/login`
- [ ] `https://1commerce.online/signup` → redirects to `app.1commerce.online/signup`
- [ ] Logging in & signing up works end-to-end
- [ ] Stripe checkout completes; webhook signature verified
- [ ] OAuth callbacks land at `app.` (no apex 404s)

### Marketing CRO

- [ ] Hero "Start Free" CTA fires `cta_click { id: "hero-primary" }` in GA4 Realtime
- [ ] Pricing tier clicks fire `pricing_select_tier`
- [ ] Dashboard tab switching fires `dashboard_tab_switch`
- [ ] Contact form fires `form_submit_success`
- [ ] Scroll depth events show 25/50/75/100 in GA4 DebugView
- [ ] Clarity Live View shows recordings within 5 min
- [ ] Floating CTA appears after scrolling past hero

### SEO / metadata

- [ ] `/sitemap.xml` returns all 8 routes
- [ ] `/robots.txt` allows crawl + points at sitemap
- [ ] OG preview looks correct on Twitter/Slack (use [opengraph.xyz](https://www.opengraph.xyz/))
- [ ] Google Search Console — submit sitemap, verify ownership via DNS TXT
- [ ] `<link rel="canonical">` resolves to `https://1commerce.online`

### Performance & a11y

- [ ] Lighthouse mobile ≥ 95 Performance, ≥ 95 SEO, ≥ 95 a11y, ≥ 95 best-practices
- [ ] Largest Contentful Paint < 1.5s on 4G (test via PageSpeed Insights)
- [ ] Keyboard navigation: tab from top → reach Skip Link, then Navbar, then Hero CTAs
- [ ] Color contrast on dark CTA band passes WCAG AA (verify with axe DevTools)

### Security

- [ ] HSTS header present (`strict-transport-security`)
- [ ] `X-Frame-Options: SAMEORIGIN` present
- [ ] CSP — if you add one, allow `https://www.googletagmanager.com`,
      `https://www.google-analytics.com`, `https://*.clarity.ms`,
      `https://www.youtube.com` (or `https://www.loom.com`)

---

## 7. Rollback plan

If anything breaks post-cutover:

1. **DNS rollback (fastest):** in Cloudflare, change the `A @` record back to
   the previous product-app target. Apex serves the old product app within
   ~1 min (low TTL recommended: 300s during cutover week).
2. **Vercel rollback:** Project → Deployments → "…" → **Promote to Production**
   on the last known-good build.
3. **Per-region issues:** Cloudflare → Caching → **Purge Everything** (only if
   proxy is ON).

---

## 8. Local dev quickstart

```bash
cd apps/marketing
cp .env.example .env.local
# edit .env.local — set NEXT_PUBLIC_DEMO_VIDEO_URL etc.

pnpm install                                  # from repo root (workspace)
pnpm --filter @unifyone/marketing dev         # http://localhost:3100
pnpm --filter @unifyone/marketing build       # production build
pnpm --filter @unifyone/marketing typecheck   # tsc --noEmit
```

---

## 9. Future hardening (optional)

- Add a **Content-Security-Policy** header in `vercel.json` once the analytics
  - embed sources are finalized.
- Consider Cloudflare **Bot Fight Mode** (off by default — can interfere with
  GA4) on the apex.
- Wire `/api/lead` and `/api/contact` to Resend, Loops, or n8n — currently
  stubbed (see `TODO(integration)` comments).
- Add Sentry monitoring for the marketing site (`@sentry/nextjs`) once traffic
  warrants it.
