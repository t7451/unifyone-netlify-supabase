# UnifyOne — Netlify Deployment Guide

## Target: unify0ne (1commerce.online)

The active Netlify project is **`unify0ne`**, serving the main app at
`1commerce.online` from the repo root via the root `netlify.toml`.

### Prerequisites

1. Netlify account connected to `t7451` GitHub account
2. Stripe live keys configured (Settings → Payment)
3. Database provisioned (Neon PostgreSQL via `DATABASE_URL`)

---

## Step 1 — Connect GitHub Repo to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Select **GitHub** → authorize `t7451` account
3. Choose the `unifyone-netlify-supabase` repository
4. Configure build settings:
   - **Base directory:** _(leave empty — root)_
   - **Build command:** `pnpm build`
   - **Publish directory:** `dist/public`
5. Click **Deploy site**

---

## Step 2 — Set Environment Variables in Netlify

Go to **Site settings → Environment variables** and add:

| Variable                      | Value                                            |
| ----------------------------- | ------------------------------------------------ |
| `DATABASE_URL`                | Neon PostgreSQL connection string                |
| `JWT_SECRET`                  | JWT signing secret (≥ 32 chars)                  |
| `SUPABASE_URL`                | Supabase project URL                             |
| `SUPABASE_ANON_KEY`           | Supabase anon key                                |
| `SUPABASE_SERVICE_ROLE_KEY`   | Supabase service role key                        |
| `SUPABASE_JWT_SECRET`         | Supabase JWT secret (fallback for `JWT_SECRET`)  |
| `VITE_SUPABASE_URL`           | Same as `SUPABASE_URL`                           |
| `VITE_SUPABASE_ANON_KEY`      | Same as `SUPABASE_ANON_KEY`                      |
| `STRIPE_SECRET_KEY`           | `sk_live_...` from Stripe Dashboard              |
| `STRIPE_WEBHOOK_SECRET`       | `whsec_...` from Stripe Webhooks                 |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` from Stripe Dashboard              |
| `GRAPH_MCP_URL`               | Graph Worker MCP endpoint URL                    |
| `GRAPH_MCP_TOKEN`             | Bearer token for Graph Worker auth (optional)    |
| `NODE_ENV`                    | `production`                                     |

---

## Step 3 — Configure Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. **Add endpoint:** `https://1commerce.online/api/billing/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the **Signing secret** → add as `STRIPE_WEBHOOK_SECRET` in Netlify env vars

---

## Step 4 — Domain Configuration

1. In Netlify → **Site settings → Domain management**
2. Add `1commerce.online` as a custom domain
3. Set up DNS records as instructed by Netlify
4. Issue HTTPS cert (automatic via Let's Encrypt)

---

## Step 5 — Test the Deployment

1. Visit `https://1commerce.online`
2. Sign in with your credentials
3. Create a tenant store and verify the dashboard loads
4. Test Stripe checkout with card `4242 4242 4242 4242`

---

## Stripe Test Cards

| Card                  | Result             |
| --------------------- | ------------------ |
| `4242 4242 4242 4242` | Success            |
| `4000 0000 0000 0002` | Declined           |
| `4000 0025 0000 3155` | 3D Secure required |

Use any future expiry date and any 3-digit CVV.

---

## Architecture Notes

This app runs as a **full-stack Express server** deployed on Netlify Functions.
The `netlify.toml` routes all `/api/*` traffic to the server function and all
other routes to the React SPA via the `index.html` fallback.
