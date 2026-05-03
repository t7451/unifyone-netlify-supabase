# Impact.com S2S Affiliate Conversion Tracking — Operations Runbook

**Owner:** Platform Eng / Growth
**Status:** Live (Phase 14 affiliate stack)
**Code:** `server/_core/impact.ts`, `server/_core/impactRoutes.ts`,
`client/src/lib/impactCapture.ts`, conversion firing in `server/stripe.ts`,
admin endpoints in `server/adminOps.ts`.

---

## 1. What this is

Server-to-server (S2S) tracking for the Impact.com affiliate network. Partners
push traffic to UnifyOne. We fire a conversion ping to Impact when the user
pays via Stripe so the partner gets credit and we get attributed revenue.

**Flow:**

1. Partner sends a click to `https://1commerce.online/?im_ref=AFFID_CLICKID`.
2. The SPA detects `im_ref` on landing, POSTs `/api/impact/click` (writes a
   row to `impact_clicks`), gets a HttpOnly `im_ref` cookie back, and strips
   the param from the URL.
3. User signs up + pays. The Stripe `create-checkout` endpoint reads the
   `im_ref` cookie and embeds the click ID in the Stripe session metadata.
4. On `checkout.session.completed`, the Stripe webhook handler calls
   `fireImpactConversion(...)`, which POSTs the conversion to Impact's
   Mediapartners Conversions endpoint and records the result in
   `impact_conversions`.
5. `impact_conversions.stripe_session_id` is `UNIQUE`, so a replayed Stripe
   webhook never double-fires.

---

## 2. Required environment variables

Set these on Netlify (Site Settings → Build & deploy → Environment, scope
`Functions` and `Runtime`, mark all three as **secret**):

| Name                 | Where to get it                                         |
| -------------------- | ------------------------------------------------------- |
| `IMPACT_ACCOUNT_SID` | Impact partner dashboard → Settings → API → Account SID |
| `IMPACT_AUTH_TOKEN`  | Same screen as the SID. Rotate quarterly.               |
| `IMPACT_CAMPAIGN_ID` | The program you're tracking conversions for             |

Optional:

| Name                  | Default                  | When to override                   |
| --------------------- | ------------------------ | ---------------------------------- |
| `IMPACT_API_BASE_URL` | `https://api.impact.com` | Sandbox / region-specific endpoint |

If any of the three required vars is missing, `fireImpactConversion`
**logs a warning and returns `{ status: "skipped" }`** instead of throwing
— the Stripe webhook is never blocked on affiliate config.

---

## 3. How a partner creates a deep link

```text
https://1commerce.online/?im_ref=AFFID_CLICKID
```

- `AFFID` — the partner's identifier (any opaque ASCII string up to ~150 chars)
- `CLICKID` — the partner's per-click ID (so they can reconcile reports)

The two are joined with an underscore and stored verbatim in
`impact_clicks.im_ref`. The platform mints its own opaque `click_id` (32 hex
chars) — _that's_ what we send to Impact as `ClickId` on the conversion ping.

---

## 4. Verify a single click → purchase

### 4.1 Click capture

```bash
curl -i -X POST https://1commerce.online/api/impact/click \
  -H "Content-Type: application/json" \
  -d '{"im_ref":"TESTPARTNER_TESTCLICK1","landing_url":"https://1commerce.online/?im_ref=TESTPARTNER_TESTCLICK1"}'
```

Expect HTTP 200 + JSON `{ clickId, persisted: true }` and a
`Set-Cookie: im_ref=...; HttpOnly; Secure; ...` header.

### 4.2 Read the cookie back

```bash
curl https://1commerce.online/api/impact/click/me \
  --cookie "im_ref=$CLICK_ID"
# → { "clickId": "<32-hex>" }
```

### 4.3 Test conversion (dry-run, no Impact API call)

```bash
curl -X POST https://1commerce.online/api/admin/impact/test-conversion \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"clickId":"<paste click_id>","amountCents":4900,"currency":"USD","dryRun":true}'
```

Expect HTTP 200, `result.status: "fired"`, `response: { dryRun: true }`,
and a fresh row in `impact_conversions`.

### 4.4 Fire a real test against Impact

```bash
curl -X POST https://1commerce.online/api/admin/impact/test-conversion \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"clickId":"<click_id>","amountCents":100,"currency":"USD","dryRun":false}'
```

Then verify the conversion lands in the Impact partner dashboard under
**Conversions → Recent**.

### 4.5 End-to-end with Stripe test mode

1. Open `https://1commerce.online/?im_ref=TESTPARTNER_E2E1` — devtools
   should show one POST to `/api/impact/click` returning 200 and the URL
   should now read `https://1commerce.online/`.
2. Sign up with a fresh email.
3. Hit checkout → use Stripe test card `4242 4242 4242 4242`.
4. After Stripe redirects back, the Stripe webhook fires
   `checkout.session.completed`. Within seconds, run:

```bash
curl -X POST https://1commerce.online/api/admin/impact/report \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"days":1}'
```

You should see your test click in `recentClicks`, your test conversion in
`recentConversions`, and `funnelRate` > 0.

---

## 5. Admin reporting

```bash
curl -X POST https://1commerce.online/api/admin/impact/report \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"days":30}'
```

Returns:

```jsonc
{
  "windowDays": 30,
  "totals": {
    "clicks": 412,
    "conversions": 18,
    "conversionsSuccessful": 17,
    "grossCents": 88200,
    "funnelRate": 0.0437
  },
  "perAffiliate": [
    { "imRef": "PARTNER_A_C001", "clicks": 92, "converted": 4 },
    ...
  ],
  "recentClicks": [...],
  "recentConversions": [...],
  "configPresent": {
    "accountSid": true,
    "authToken": true,
    "campaignId": true
  }
}
```

If `configPresent` is `false` for any field, conversions are silently
skipped — go set the env vars and redeploy.

---

## 6. Privacy & compliance

- IPs are stored as **SHA-256 hash only** (`impact_clicks.ip_hash`). The
  raw address never touches the database.
- The `im_ref` cookie is `HttpOnly`, `SameSite=Lax`, `Secure`, and scoped
  to the configured `COOKIE_DOMAIN` (so it doesn't leak across Netlify
  preview branches).
- The `?im_ref=` query parameter is stripped from the URL via
  `history.replaceState` immediately after capture so it doesn't leak via
  Referer headers, screenshots, or shared links.

---

## 7. Schema

```sql
-- migration 0038_impact_affiliate_tracking.sql
impact_clicks(
  id, click_id UNIQUE, im_ref, landing_url, ip_hash, user_agent,
  referer, user_id, converted_at, created_at
)
impact_conversions(
  id, click_id, stripe_session_id UNIQUE, amount_cents, currency,
  impact_response JSON, http_status, success, fired_at
)
```

Apply with `pnpm drizzle-kit push` against the production database
(remember: drizzle migrations are partially broken in this repo — use
`push`, not `migrate`).

---

## 8. Failure modes & on-call notes

| Symptom                          | Likely cause                                                               | Fix                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `funnelRate: 0` despite clicks   | Cookie not surviving Stripe redirect                                       | Verify `COOKIE_DOMAIN=.1commerce.online` — without leading dot, cookie scoped to apex only                     |
| All conversions `success: false` | Bad SID / token / campaign                                                 | Hit `/api/admin/impact/report` and inspect `recentConversions[*].impact_response` for the literal Impact error |
| `status: "skipped"` everywhere   | `IMPACT_*` env vars not set                                                | Set them, redeploy                                                                                             |
| Duplicate Impact pings           | Should be impossible — UNIQUE on `stripe_session_id`. If seen, file a bug. |

Logs:

- Successful fire: `[Impact] Conversion fired` (info)
- Skipped: `Impact conversion skipped: missing config` (warn)
- Failed: `Impact conversion failed (recorded for retry)` (error)

The conversion row is _always_ persisted (success=true or false) so we have
a forensic trail and can manually retry by reading
`impact_conversions.impact_response` and POSTing again with curl.
