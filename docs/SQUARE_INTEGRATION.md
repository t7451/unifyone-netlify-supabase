# Square integration runbook

Production-grade Square hosted checkout via Payment Links + payment webhook,
mirrored from the Stripe path (`server/stripe.ts`).

## Architecture

```
Browser (Checkout.tsx)
  └─ "Pay with Square" button
       ──► POST /api/square/create-checkout   (JWT-authed)
              └─ server/square.ts → Square checkout.paymentLinks.create
              └─ returns checkoutUrl, browser redirects there

Square (out-of-band):
  ──► POST /api/square/webhook   (HMAC-SHA256 signed)
       └─ server/square.ts:handleSquareWebhook
            ├─ verifies signature against SQUARE_WEBHOOK_NOTIFICATION_URL
            ├─ persist to square_webhook_events (idempotent on event_id)
            ├─ resolve tenant via order metadata (tenant_id, user_id, etc.)
            ├─ update orders.paymentStatus on payment.created/updated
            ├─ update tenants.subscriptionStatus on subscription.* events
            └─ fireImpactConversion (idempotent on "square_<paymentId>")

After redirect back from Square:
  ──► POST /api/square/capture-payment   (JWT-authed, optional)
       └─ server/square.ts → Square Payments.get(payment_id)
       └─ syncs orders row + fires Impact conversion if not yet fired
```

## Required environment variables (Netlify)

| Var                               | Required                | Source                                                                     |
| --------------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `SQUARE_ACCESS_TOKEN`             | yes                     | Square Developer Dashboard → app → Credentials → Access Token (production) |
| `SQUARE_LOCATION_ID`              | yes                     | Square Dashboard → Account & Settings → Business → Locations               |
| `SQUARE_WEBHOOK_SIGNATURE_KEY`    | yes for prod            | Webhooks → endpoint → Signature Key                                        |
| `SQUARE_WEBHOOK_NOTIFICATION_URL` | yes for prod            | The exact URL configured on Square — defends against host-header forgery   |
| `SQUARE_ENVIRONMENT`              | yes                     | `sandbox` or `production`                                                  |
| `ADMIN_API_KEY`                   | yes for /admin/discover | Already configured for Stripe                                              |

## Webhook configuration

Register this URL on Square Developer → Webhooks → Add endpoint:

```
https://1commerce.online/api/square/webhook
```

Subscribe to these events:

- `payment.created`
- `payment.updated`
- `subscription.created`
- `subscription.updated`

Copy the **Signature Key** from the endpoint detail page into
`SQUARE_WEBHOOK_SIGNATURE_KEY`.

Set `SQUARE_WEBHOOK_NOTIFICATION_URL` to the exact URL above. The webhook
handler signs against this URL — without it set, an attacker who can
spoof the `Host` header could forge signatures.

## Tenant linking

`createSquareCheckout` stamps the order's `metadata` with:

```json
{
  "internal_order_id": "42",
  "tenant_id": "7",
  "user_id": "99",
  "im_click_id": "hexabc"
}
```

Square webhooks for `payment.*` only carry the order id, so
`applySquareEvent` does an extra `orders.get()` call to retrieve the
metadata, then runs `resolveTenantForSquare` (mirrors
`stripe.ts:resolveTenantForCheckout`).

## Idempotency

- **Webhooks** — every delivery is recorded into `square_webhook_events`
  keyed by `event_id` (UUID). Replays update the row's `status` field but
  never re-run side effects (upsert on `event_id`).
- **Impact conversions** — keyed on
  `stripeSessionId = "square_<paymentId>"`, which collides with
  `impact_conversions.stripe_session_id` UNIQUE. Both the webhook path and
  the redirect-back capture path can fire safely.
- **Hosted checkout link creation** — `idempotencyKey = crypto.randomUUID()`
  per call; Square's API itself enforces idempotency on the key.

## Sandbox-mode end-to-end test

1. Netlify env:
   ```
   SQUARE_ENVIRONMENT=sandbox
   SQUARE_ACCESS_TOKEN=<sandbox access token from app credentials>
   SQUARE_LOCATION_ID=<sandbox location id>
   SQUARE_WEBHOOK_SIGNATURE_KEY=<sandbox webhook key>
   SQUARE_WEBHOOK_NOTIFICATION_URL=https://1commerce.online/api/square/webhook
   ```
2. Square sandbox test cards (no real money):
   - **Success**: `4111 1111 1111 1111`, any future expiry, CVV `111`, postal `94103`
   - **Declined**: `4000 0000 0000 0002`
   - **CVV failure**: `4000 0000 0000 0101`
3. Open `/checkout`, pick Square. Browser redirects to
   `sandbox.squareup.com/...`. Pay with the test card.
4. Square redirects back to `/dashboard?square=success`.
5. Within seconds the webhook fires:
   ```bash
   curl -X POST https://1commerce.online/api/square/admin/discover \
     -H "x-admin-key: $ADMIN_API_KEY"
   ```
   Look for an event with `eventType=payment.updated` and
   `status=processed`.

## Flipping sandbox → live

1. Replace `SQUARE_*` Netlify env vars with the live (production) values.
   The Square production access token is a different string from the
   sandbox token — both are valid simultaneously.
2. Set `SQUARE_ENVIRONMENT=production`.
3. Re-register the webhook on the production app; new signature key.
4. Redeploy and hit `/api/square/admin/discover` — `environment` should
   read `production` and `webhookConfigured: true`.

## Failure runbook

| Symptom                                                 | Likely cause                                                                          | Fix                                                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/square/create-checkout` returns 503               | `SQUARE_ACCESS_TOKEN` or `SQUARE_LOCATION_ID` missing                                 | Set Netlify env, redeploy                                                                                                                             |
| Webhook returns 400 "Invalid signature"                 | `SQUARE_WEBHOOK_SIGNATURE_KEY` rotated, or `SQUARE_WEBHOOK_NOTIFICATION_URL` mismatch | Compare key/URL with Square dashboard                                                                                                                 |
| Webhook returns 503                                     | `SQUARE_WEBHOOK_SIGNATURE_KEY` not set                                                | Set env var; redeploy                                                                                                                                 |
| Order paid in Square but DB not updated                 | Metadata missing on order                                                             | Operator created the link manually; resolveTenantForSquare returns undefined, the row stays unpaid. Fix by re-running through `createSquareCheckout`. |
| `square_webhook_events` rows pile up at `status=failed` | Apply step crashed                                                                    | Inspect `error_message` column; replay from Square dashboard once fixed                                                                               |

## Files

- `server/square.ts` — REST helpers + Express + Fetch handlers
- `server/square.test.ts` — unit tests (HMAC verification, config gating)
- `drizzle/0040_paypal_square_webhook_events.sql` — `square_webhook_events` table
- `drizzle/schema.ts` — `squareWebhookEvents` Drizzle definition
- `client/src/pages/Checkout.tsx` — Square redirect UI
