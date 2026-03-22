# UnifyOne — Netlify Deployment Guide

## Target: operation-v3.netlify.app

### Prerequisites

1. Netlify account connected to `ksksrbiz-arch` GitHub org
2. Stripe live keys configured (Settings → Payment)
3. Database provisioned (already done via Manus managed DB)

---

## Step 1 — Connect GitHub Repo to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Select **GitHub** → authorize `ksksrbiz-arch` org
3. Choose the `unifyone-platform` repository (or the Manus-exported repo)
4. Configure build settings:
   - **Base directory:** _(leave empty — root)_
   - **Build command:** `pnpm build`
   - **Publish directory:** `dist/public`
5. Click **Deploy site**

---

## Step 2 — Set Environment Variables in Netlify

Go to **Site settings → Environment variables** and add:

| Variable                      | Value                                         |
| ----------------------------- | --------------------------------------------- |
| `DATABASE_URL`                | Your MySQL/TiDB connection string             |
| `JWT_SECRET`                  | Your JWT signing secret                       |
| `OAUTH_CLIENT_ID`             | OAuth client ID from your identity provider   |
| `OAUTH_CLIENT_SECRET`         | OAuth client secret (if required by provider) |
| `OAUTH_AUTHORIZE_URL`         | Provider authorize endpoint                   |
| `OAUTH_TOKEN_URL`             | Provider token endpoint                       |
| `OAUTH_USERINFO_URL`          | Provider userinfo endpoint                    |
| `OAUTH_SCOPE`                 | Scopes, e.g. `openid profile email`           |
| `STRIPE_SECRET_KEY`           | `sk_live_...` from Stripe Dashboard           |
| `STRIPE_WEBHOOK_SECRET`       | `whsec_...` from Stripe Webhooks              |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` from Stripe Dashboard           |
| `NODE_ENV`                    | `production`                                  |

---

## Step 3 — Configure Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. **Add endpoint:** `https://operation-v3.netlify.app/api/stripe/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the **Signing secret** → add as `STRIPE_WEBHOOK_SECRET` in Netlify env vars

---

## Step 4 — Rename Site to operation-v3

1. In Netlify → **Site settings → General → Site details**
2. Click **Change site name** → enter `operation-v3`
3. Your site will be live at `https://operation-v3.netlify.app`

---

## Step 5 — Test the Deployment

1. Visit `https://operation-v3.netlify.app`
2. Click **Start Free Trial** → authenticate via configured OAuth provider
3. Create your first tenant store
4. Add a product using the new CRUD modal
5. Test Stripe checkout with card `4242 4242 4242 4242`

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

This app runs as a **full-stack Express server** deployed on Netlify. The `netlify.toml` routes all `/api/*` traffic to the server and all other routes to the React SPA via the `index.html` fallback.

For true serverless Netlify Functions, a future migration to individual function files under `netlify/functions/` would be needed — but the current Express adapter works for the initial deployment.
