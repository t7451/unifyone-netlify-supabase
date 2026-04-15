# UnifyOne Production Checklist

Use this document before every production deployment to ensure all required
infrastructure, environment variables, DNS records, and post-deployment
verifications are in place.

---

## 1. Required Environment Variables

These variables **must** be set before the application will start.

| Variable | Description | How to obtain |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon, Supabase, or self-hosted) | Neon: _Dashboard → Project → Connection string_. Format: `postgresql://user:password@host/dbname?sslmode=require` |
| `JWT_SECRET` | 32-character minimum secret for signing session cookies | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PUBLIC_APP_URL` | Canonical base URL of the app (no trailing slash) | E.g. `https://1commerce.online`. Used in emails, redirects, and OAuth callbacks. |
| `OAUTH_CLIENT_ID` | Client ID from your OAuth provider | Register your app in the provider's developer console. |
| `OAUTH_CLIENT_SECRET` | Client secret from your OAuth provider | Obtained alongside `OAUTH_CLIENT_ID`. Store securely — never commit to source control. |

> **Startup guard:** The server will throw a descriptive error at boot time if
> `JWT_SECRET` is absent or shorter than 32 characters, preventing insecure
> deployments from accepting traffic.

---

## 2. Optional But Important Variables

These variables are not required to boot, but disable significant features when absent.

| Variable | Description | How to obtain |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe API secret for subscriptions and one-time payments | Stripe Dashboard → Developers → API keys → Secret key (use `sk_live_…` in production) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret for verifying Stripe events | Stripe Dashboard → Developers → Webhooks → Signing secret (per endpoint) |
| `RESEND_API_KEY` | API key for transactional email via Resend | [resend.com](https://resend.com) → API Keys |
| `VITE_SUPABASE_URL` | Supabase project URL for Realtime WebSocket channels | Supabase Dashboard → Project Settings → API → URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for server-side admin operations | Supabase Dashboard → Project Settings → API → Service role key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for the client-side Stripe.js integration | Stripe Dashboard → Developers → API keys → Publishable key |
| `PAYPAL_CLIENT_ID` | PayPal REST API client ID | PayPal Developer Dashboard → My Apps & Credentials |
| `PAYPAL_CLIENT_SECRET` | PayPal REST API client secret | Obtained alongside `PAYPAL_CLIENT_ID` |
| `SQUARE_ACCESS_TOKEN` | Square API access token | Square Developer Dashboard → Applications → Access token |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Square webhook signature key for verifying Square events | Square Developer Dashboard → Webhooks → Signature key |

---

## 3. OAuth Redirect URIs

Register the following redirect URIs with your OAuth provider **before** going live.
Omitting these will cause the OAuth login flow to fail with a redirect mismatch error.

**Production (apex domain):**
```
https://1commerce.online/api/oauth/callback
```

**Staging (Netlify preview):**
```
https://<site>.netlify.app/api/oauth/callback
```

### Steps to register in most OAuth provider dashboards:
1. Open your OAuth application settings.
2. Navigate to **Redirect URIs** (sometimes called _Authorized redirect URIs_ or _Callback URLs_).
3. Add each URI from the list above as a separate entry.
4. Save and allow a few minutes for the change to propagate.

---

## 4. DNS Configuration for `1commerce.online`

Perform these steps in your DNS provider's control panel **before** enabling the
custom domain in Netlify.

| Record type | Host | Value | TTL |
|---|---|---|---|
| A | `@` (apex) | `75.2.60.5` | 3600 |
| CNAME | `www` | `<site>.netlify.app` | 3600 |

After creating the DNS records:
1. In Netlify → **Site settings → Domain management**, add `1commerce.online` as a custom domain.
2. Add `www.1commerce.online` as a **domain alias** to enable www → apex redirect.
3. Wait for **HTTPS certificate** provisioning via Let's Encrypt (typically 1–5 minutes once DNS propagates).
4. Verify at [dnschecker.org](https://dnschecker.org) that the A record resolves globally.

---

## 5. Post-Deployment Verification

Run the following checks immediately after each deployment:

| Check | Expected result |
|---|---|
| `curl https://1commerce.online/` | Returns HTTP 200 with the app HTML |
| `curl https://1commerce.online/dashboard` | Returns HTTP 200 (SPA shell — no 404) |
| `curl https://1commerce.online/api/health` | Returns `{"status":"ok"}` |
| OAuth login flow | Completes successfully and sets a session cookie |
| `curl https://1commerce.online/sitemap.xml` | Returns HTTP 200 with XML |
| `curl https://1commerce.online/robots.txt` | Returns HTTP 200 with plain text |
| `curl -I https://www.1commerce.online/` | Returns HTTP 301/302 redirecting to `https://1commerce.online/` |

---

## 6. Pre-Launch Security Checklist

- [ ] `JWT_SECRET` is at least 32 characters and not the default or a test value
- [ ] `STRIPE_SECRET_KEY` uses `sk_live_…` (not `sk_test_…`) in production
- [ ] All webhook endpoints are registered in Stripe/PayPal/Square dashboards with their correct signing secrets
- [ ] OAuth client secret is stored only in environment variables — never in source code
- [ ] `DATABASE_URL` points to the production database (not a dev/staging instance)
- [ ] HTTPS certificate is active and auto-renewing (Let's Encrypt via Netlify)
- [ ] Sentry DSN is set (`SENTRY_DSN`) for production error monitoring
