# PayPal integration runbook

Production-grade PayPal Smart Buttons + REST checkout, mirrored from the
Stripe path (`server/stripe.ts`).

## Architecture

```
Browser (Checkout.tsx)
  └─ PayPal SDK Smart Buttons
       │   createOrder()  ──►  POST /api/paypal/create-order   (JWT-authed)
       │                         └─ server/paypal.ts → PayPal /v2/checkout/orders
       │   onApprove()    ──►  POST /api/paypal/capture-order  (JWT-authed)
       │                         └─ server/paypal.ts → PayPal /v2/checkout/orders/{id}/capture
       └─ webhook (out-of-band):
              PayPal  ──►  POST /api/paypal/webhook
                                 └─ verify-webhook-signature → applyPayPalEvent
                                          ├─ persist to paypal_webhook_events
                                          ├─ update orders.paymentStatus
                                          ├─ update tenants.subscriptionStatus
                                          └─ fireImpactConversion (idempotent)
```

## Required environment variables (Netlify)

| Var                     | Required                | Source                                                                                        |
| ----------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| `PAYPAL_CLIENT_ID`      | yes                     | PayPal Developer → My Apps → REST API app → Live → Client ID                                  |
| `PAYPAL_CLIENT_SECRET`  | yes                     | Same screen → Secret                                                                          |
| `VITE_PAYPAL_CLIENT_ID` | yes                     | Same value as PAYPAL_CLIENT_ID (exposed to browser for SDK)                                   |
| `PAYPAL_WEBHOOK_ID`     | yes for prod            | PayPal Developer → My Apps → Webhooks → ID column                                             |
| `PAYPAL_API_BASE_URL`   | no                      | Defaults to `https://api-m.paypal.com`; set to `https://api-m.sandbox.paypal.com` for sandbox |
| `ADMIN_API_KEY`         | yes for /admin/discover | Already configured for Stripe                                                                 |

## Webhook configuration

Register this URL on PayPal Developer → Webhooks:

```
https://1commerce.online/api/paypal/webhook
```

Subscribe to these events:

- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.UPDATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `BILLING.SUBSCRIPTION.SUSPENDED`
- `BILLING.SUBSCRIPTION.EXPIRED`

Copy the resulting Webhook ID into `PAYPAL_WEBHOOK_ID`. Without that env var,
`/api/paypal/webhook` fails closed and rejects every request with 400.

## Tenant linking

`createPayPalOrder` stamps a compact `custom_id` on the purchase unit:

```
oid=42;tid=7;uid=99;imc=hexabc
```

Where `oid` = internal order ID, `tid` = tenant ID, `uid` = user ID,
`imc` = Impact.com click ID. `parseCustomId` decodes this and
`resolveTenantForPayPal` looks up the tenant via the order row, then the
tenant ID, then the user's owned tenants — same priority order as
`stripe.ts:resolveTenantForCheckout`.

## Idempotency

- **Captures** — calling `/api/paypal/capture-order` twice with the same
  `paypalOrderId` is safe. PayPal returns `ORDER_ALREADY_CAPTURED` on the
  second call; we re-fetch the order and return the existing capture
  without raising an error.
- **Webhooks** — every delivery is recorded into `paypal_webhook_events`
  keyed by the unique `event_id`. Replays update the row's `status` field
  but never re-run side effects (the upsert is on `event_id`).
- **Impact conversions** — `fireImpactConversion` is keyed off
  `stripeSessionId = "paypal_<captureId>"`, which collides with the
  existing `impact_conversions.stripe_session_id` UNIQUE constraint. Both
  the direct capture path and the webhook path are safe to fire.

## Sandbox-mode end-to-end test

1. Set Netlify (or `.env`) to:
   ```
   PAYPAL_API_BASE_URL=https://api-m.sandbox.paypal.com
   PAYPAL_CLIENT_ID=<sandbox client id>
   PAYPAL_CLIENT_SECRET=<sandbox client secret>
   VITE_PAYPAL_CLIENT_ID=<sandbox client id>
   PAYPAL_WEBHOOK_ID=<sandbox webhook id>
   ```
2. PayPal Developer → Sandbox → Accounts. Use the personal (buyer) account
   created automatically.
3. Open `https://1commerce.online/checkout` (or the deploy preview URL),
   pick PayPal, and sign in with the sandbox buyer email.
4. After approval, the front end calls `/api/paypal/capture-order`. Check:
   ```bash
   curl -X POST https://1commerce.online/api/paypal/admin/discover \
     -H "x-admin-key: $ADMIN_API_KEY"
   ```
   You should see one row with `eventType=PAYMENT.CAPTURE.COMPLETED` and
   `status=processed` in `recentEvents`.

## Flipping sandbox → live

1. Replace the four `PAYPAL_*` Netlify env vars with the live values.
2. `PAYPAL_API_BASE_URL` can be unset (defaults to live) or set to
   `https://api-m.paypal.com`.
3. Re-register the webhook on the live app and copy the live
   `PAYPAL_WEBHOOK_ID`.
4. Redeploy. Hit `/api/paypal/admin/discover` to confirm `livemode: true`.

## Failure runbook

| Symptom                                                 | Likely cause                            | Fix                                                                     |
| ------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------- |
| `/api/paypal/create-order` returns 401                  | User not signed in                      | Have user sign in; check `app_session_id` cookie present                |
| Webhook returns 400 "Invalid webhook signature"         | `PAYPAL_WEBHOOK_ID` mismatch or rotated | Compare ID at PayPal dashboard with Netlify env; rotate if needed       |
| Capture returns 422 ORDER_ALREADY_CAPTURED              | Buyer double-clicked or polling         | Handler now returns success — check `orders.paymentStatus = paid`       |
| `paypal_webhook_events` rows pile up at `status=failed` | Apply step crashed                      | Inspect `error_message` column; replay from PayPal dashboard once fixed |

## Files

- `server/paypal.ts` — REST helpers + Express + Fetch handlers
- `server/paypal.test.ts` — unit tests (config gating, fail-closed verify, parseCustomId)
- `drizzle/0040_paypal_square_webhook_events.sql` — `paypal_webhook_events` table
- `drizzle/schema.ts` — `paypalWebhookEvents` Drizzle definition
- `client/src/pages/Checkout.tsx` — Smart Buttons UI
