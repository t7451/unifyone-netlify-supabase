# UnifyOne — Netlify + Supabase Deployment Guide

## Architecture Overview

| Layer       | Technology                | Notes                                            |
| ----------- | ------------------------- | ------------------------------------------------ |
| Frontend    | React 19 SPA (Vite)       | Built to `dist/public`, served by Netlify CDN    |
| Backend API | Express + tRPC 11         | Runs as Netlify Function via `serverless-http`   |
| Database    | PostgreSQL / Neon (Drizzle ORM) | External — connection via `DATABASE_URL`    |
| Real-time   | Supabase (optional)       | Graceful degradation if not configured           |
| Auth        | Custom OAuth + PKCE + JWT | Session cookies, dynamic redirect URIs           |
| Payments    | Stripe, PayPal, Square    | Webhook routes registered before JSON middleware |

## Phase 1: DNS Migration (from legacy Manus infrastructure)

### Step 1 — Add custom domain in Netlify

1. Go to **Netlify Dashboard → Site settings → Domain management**
2. Click **Add custom domain** → enter `1commerce.online`
3. Also add `www.1commerce.online` as a domain alias

### Step 2 — Update DNS records

At your domain registrar, replace ALL existing DNS records for `1commerce.online`:

```
# Remove legacy Manus A/CNAME records, then add:
Type   Name   Value                              TTL
─────  ─────  ───────────────────────────────────  ────
A      @      75.2.60.5                           300
CNAME  www    <your-site>.netlify.app.            300
```

> The A record IP is Netlify's load balancer. Verify the current IP in your
> Netlify dashboard under **Domain management → DNS records** (it may change).
> Alternatively, use Netlify DNS for automatic management.

### Step 3 — Enable HTTPS

Netlify provisions a Let's Encrypt certificate automatically once DNS propagates.
Verify at **Site settings → Domain management → HTTPS**.

### Step 4 — Set environment variables in Netlify

Go to **Site settings → Environment variables** and set:

```
PUBLIC_APP_URL=https://1commerce.online
```

This is the canonical URL used by:

- OAuth redirect URIs (dynamically built from request origin or this env var)
- Email template links
- Meta CAPI event source URLs
- Stripe checkout success/cancel URLs
- Sitemap and SEO metadata (at build time)

## Phase 2: Required Environment Variables

### Server-side (set in Netlify dashboard)

| Variable                | Required | Description                                         |
| ----------------------- | -------- | --------------------------------------------------- |
| `DATABASE_URL`          | Yes      | PostgreSQL (Neon) connection string                 |
| `JWT_SECRET`            | Yes      | Session cookie signing secret                       |
| `PUBLIC_APP_URL`        | Yes      | Canonical app URL (e.g. `https://1commerce.online`) |
| `OAUTH_CLIENT_ID`       | Yes      | OAuth provider client ID                            |
| `OAUTH_CLIENT_SECRET`   | Yes      | OAuth provider client secret                        |
| `OAUTH_AUTHORIZE_URL`   | Yes      | OAuth authorization endpoint                        |
| `OAUTH_TOKEN_URL`       | Yes      | OAuth token endpoint                                |
| `OAUTH_USERINFO_URL`    | Yes      | OAuth userinfo endpoint                             |
| `OAUTH_ISSUER`          | No       | OAuth issuer URL                                    |
| `OAUTH_JWKS_URL`        | No       | JWKS endpoint for token verification                |
| `OWNER_OPEN_ID`         | No       | Admin user's OpenID `sub` claim                     |
| `STRIPE_SECRET_KEY`     | No       | Stripe API secret key                               |
| `STRIPE_WEBHOOK_SECRET` | No       | Stripe webhook signing secret                       |
| `RESEND_API_KEY`        | No       | Resend email service API key                        |

### Client-side (prefixed with `VITE_`)

| Variable                 | Required | Description               |
| ------------------------ | -------- | ------------------------- |
| `VITE_SUPABASE_URL`      | No       | Supabase project URL      |
| `VITE_SUPABASE_ANON_KEY` | No       | Supabase anonymous key    |
| `VITE_PAYPAL_CLIENT_ID`  | No       | PayPal client-side SDK ID |

## Phase 3: OAuth Redirect URLs

The OAuth callback URL is **dynamically built** from the incoming request's host header
(see `server/_core/sdk.ts:buildRedirectUri`). This means it automatically works for:

- `https://1commerce.online/api/oauth/callback`
- `https://<site>.netlify.app/api/oauth/callback`
- `http://localhost:3000/api/oauth/callback`

**Action required**: In your OAuth provider's settings, add the following as
allowed redirect URIs:

```
https://1commerce.online/api/oauth/callback
https://<your-site>.netlify.app/api/oauth/callback
```

## Phase 4: How the tRPC Backend Deploys

The tRPC backend runs as a **Netlify Function** (not a standalone Node.js server):

1. `netlify.toml` routes `/api/*` → `/.netlify/functions/server`
2. `netlify/functions/server.ts` wraps Express with `serverless-http`
3. All tRPC procedures, OAuth, Stripe/PayPal/Square webhooks run inside this function
4. Build step: `esbuild` bundles the server to `dist/index.js`

No separate backend deploy target is needed — it's all in the Netlify Function.

## Phase 5: SPA Routing (404 fix)

The `netlify.toml` includes the SPA fallback redirect:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

This ensures direct URL loads (e.g. `/dashboard`, `/products`) serve the React app
instead of returning 404. The `/api/*` redirect is ordered first, so API calls
are correctly routed to the serverless function.

## Phase 6: Verification Checklist

After DNS migration, verify:

- [ ] `https://1commerce.online` loads the React SPA
- [ ] `https://1commerce.online/dashboard` loads (no 404)
- [ ] `https://1commerce.online/api/health` returns `{"status":"ok"}`
- [ ] OAuth login flow completes (redirects back to `/auth/callback`)
- [ ] `https://1commerce.online/sitemap.xml` returns valid XML
- [ ] `https://1commerce.online/robots.txt` references correct domain
- [ ] HTTPS certificate is active (green lock)
- [ ] Stripe/PayPal webhooks reach the function endpoint
- [ ] `https://www.1commerce.online` 301-redirects to `https://1commerce.online`
- [ ] Contact form on `/contact` succeeds (CONTACT_WEBHOOK_URL set)

## Required Environment Variables (Netlify dashboard)

In addition to `DATABASE_URL`, OAuth secrets, and payment keys, set:

| Variable                  | Purpose                                                                                         | If unset                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `VITE_META_PIXEL_ID`      | Meta CAPI / Pixel for ad attribution                                                            | Pixel block in `client/index.html` no-ops silently — ad campaigns will look like they have "no analytics" |
| `VITE_ANALYTICS_ENDPOINT` | Umami self-hosted analytics endpoint                                                            | Secondary analytics block no-ops                                                                          |
| `CONTACT_WEBHOOK_URL`     | Webhook (Slack/n8n/Zapier) for `/contact` form submissions                                      | Submissions are accepted but only logged server-side                                                      |
| `PUBLIC_APP_URL`          | Canonical hostname used for `__APP_URL__` rewrites in `index.html`, `sitemap.xml`, `robots.txt` | Defaults to `https://1commerce.online`                                                                    |

## Domain Aliases

For the `www → apex` redirect in `netlify.toml` to fire, the `www.1commerce.online`
subdomain **must be added as a domain alias** in Netlify → Site settings → Domain
management. Without the alias, `www` will fail DNS resolution before the redirect
rule is reached.
