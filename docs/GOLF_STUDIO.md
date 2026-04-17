# Golf Club Custom Studio — Backend

Feature backend for the 3D golf club configurator. Runs on the existing UnifyOne stack — Netlify Functions + Supabase (Postgres, Auth, Storage) + Stripe. No new infrastructure.

## Files

```
drizzle/migrations/0002_golf_studio.sql                 -- tables, RLS, storage buckets (hand-written, apply manually)
netlify/functions/_lib/supabase.ts                      -- userClient / serviceClient / requireUser
netlify/functions/golf-config.mts                       -- POST/GET /api/golf/config
netlify/functions/golf-logo-url.mts                     -- POST    /api/golf/logo-url  (signed upload URL)
netlify/functions/golf-order.mts                        -- POST    /api/golf/order     (PaymentIntent)
netlify/functions/golf-stripe-webhook-background.mts    -- POST    /api/golf/stripe-webhook
client/src/features/golf-studio/useGolfStudio.ts        -- client hook
```

## Env vars

Already on Netlify — confirm with `netlify env:list`:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`

New:

- `STRIPE_GOLF_WEBHOOK_SECRET` — separate from the platform webhook secret so golf-studio failures don't cross-contaminate existing subscription/credit flows.

## Manual steps after merge

1. **Apply migration** — paste `drizzle/migrations/0002_golf_studio.sql` into the UnifyOne primary Supabase SQL editor and run. (This is hand-written SQL against Supabase; it is NOT tracked by `drizzle-kit` generate and sits in `drizzle/migrations/` alongside `0001_add_custom_auth.sql` per repo convention.)
2. **Register Stripe webhook** — in Stripe Dashboard add endpoint `https://1commerce.online/api/golf/stripe-webhook`, events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`. Copy signing secret into `STRIPE_GOLF_WEBHOOK_SECRET` on Netlify.
3. **Test locally** — `stripe listen --forward-to localhost:8888/api/golf/stripe-webhook` then `stripe trigger payment_intent.succeeded`.

## Architecture notes

- **Logo uploads bypass the function entirely.** Client PUTs directly to Supabase Storage via a signed URL. Dodges Netlify's 6 MB sync body limit, keeps cold starts thin.
- **Orders are service-role inserts only.** RLS has no user INSERT policy on `golf_orders` by design — prevents client-side price tampering.
- **Pricing enforced server-side** in `golf-order.mts`. Frontend pricing is display-only.
- **Webhook is `-background.mts` suffixed** so Netlify runs it as a background function, giving headroom for GLB enqueueing without blocking the 200 response to Stripe.

## Deferred (phase 2)

- **Real GLB generation** — `node-three` + `gltf-pipeline` on an Nvidia GPU worker, writing to `golf-glb` bucket. Queue from webhook's `payment_intent.succeeded` branch.
- **Stripe Tax** — `automatic_tax: { enabled: true }` + a `Customer` with address when OR/WA rules require it.
- **Admin dashboard** — `/admin/golf/orders` using service-role queries (~1hr).
- **Impact attribution pipeline** — `impact_click_id` is captured at order time; forward conversions to Impact.com from the succeeded branch, matching existing Shopify flow.
