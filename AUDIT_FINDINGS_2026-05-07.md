# UnifyOne — Repo Functionality Audit (2026-05-07)

Audit of `claude/audit-repo-functionality-IiwVX` against `main`. The goal was
to surface any code paths in the repo that are nonfunctional, stubbed, or
silently broken.

## TL;DR

The codebase is healthier than its size suggests:

- `pnpm check` — **passes** with 0 errors.
- `pnpm lint` — **passes** with 0 errors / 14 `react-refresh/only-export-components` warnings (style only).
- `pnpm test` — **62 test files / 538 tests pass**, 2 files / 7 tests skipped (env-gated live integration tests for Meta CAPI, PayPal, Resend — expected).

The findings below are real but fall into three buckets:

1. **Confirmed stubs** — code that returns/persists nothing useful end-to-end.
2. **Tenant-isolation gaps** — endpoints that accept `tenantId` from the client without checking it against the JWT.
3. **Documented gaps** — already tracked in `TODO.md` / `POST_LAUNCH_ROADMAP.md` / `PLAN.md`, listed here for completeness.

---

## 1. Confirmed stubs / nonfunctional code paths

### 1.1 `social.connectAccount` never actually connects

`server/routers/social.ts:273-318` writes `isConnected: false` on every
upsert. A grep across the codebase confirms **no code path ever flips
`isConnected` to `true`** — there is no OAuth callback for Twitter,
Instagram, LinkedIn, Facebook, or TikTok. The Social page filters
`accounts.filter(a => a.isConnected)` (`client/src/pages/Social.tsx:237`)
so the UI will always show zero connected accounts.

### 1.2 `social.publish` does not publish

`server/routers/social.ts:195-239` only flips the row to
`status: "published"` and inserts a `webhook_events` row with
`status: "pending"`. There is no consumer that reads pending
`webhook_events` and posts to Twitter / Instagram / LinkedIn / Facebook /
TikTok APIs.

### 1.3 n8n inbound webhook receiver is a verified-receipt stub

`server/n8nWebhook.ts:11-15` is explicit:

> The body is intentionally NOT processed yet — this is a verified-receipt stub.

The receiver verifies the HMAC signature correctly, then `console.log`s and
returns 200. Nothing is persisted to `webhook_events`, no event handlers
fire. **The Developer Hub advertises `/api/n8n/webhook` as the integration
URL** (`server/routers/developer.ts:752`), so operators wiring n8n into
UnifyOne will get a 200 OK and silent no-op.

### 1.4 Netlify-mode Billing routes disabled

`server/billing.ts:323-324`:

```ts
// Fetch-based route handler stub (for Netlify serverless; not yet implemented)
export const registerBillingFetchRoutes: null = null;
```

`server/_core/nonTrpcRoutes.ts:103` consults this export to route
`/api/billing/*` on Netlify Functions. Because it's `null`, those routes
are unavailable in production-on-Netlify; they only work via the Express
mount used by `pnpm start`.

### 1.5 Webhook events table has no processor

`webhook_events` rows are written from many places (`shopify.ts:243`,
`social.ts:221`, `db.ts:1178/1194`) and `retryWebhookEvent`
(`server/db.ts:1287-1294`) re-marks them as `pending`. **No code reads
`status='pending'` rows and processes them.** The Developer Hub exposes
`developer.retryWebhook` to re-enqueue, but there is no async worker
that drains the queue, so retried events stay pending indefinitely.

### 1.6 Voice transcription scaffolding is unwired

`server/_core/voiceTranscription.ts` exports a working `transcribeAudio()`
function (Whisper API call to `BUILT_IN_FORGE_API_URL`). **Nothing imports
it.** No `voiceRouter` exists in `server/routers.ts`. The example tRPC
procedure is in a JSDoc block at the bottom of the file.

### 1.7 CLI local-agent relay is a 30-second timeout stub

`server/_core/cliWebSocket.ts:295-311` accepts a browser WebSocket,
issues a one-time agent token, and waits up to 30 s for a separate
`unifyone-agent` binary to connect on `/api/cli/local-relay`. If the
binary doesn't exist on the user's machine (it isn't shipped from this
repo), the connection closes cleanly with "Local agent did not connect
within 30 seconds." The CLI Terminal page will hang and disconnect.

### 1.8 Clipper engine defaults to "stub"

`server/routers/clippers.ts:46`, `server/routers/clippers.ts:150`, and
`server/lib/clipperWorker.ts:45` all default `engine` to `"stub"`. The
`stub` adapter (in `clippers/run_job.py`) is intentional — it produces
synthetic clips fast for end-to-end testing. The `"basic"` adapter is the
real one, but the public createJob mutation defaults to `stub`, so any
non-test caller who omits `engine` will get fake output. Consider flipping
the default to `"basic"` in production.

### 1.9 `AuthorizationHub.tsx` is a UI shell

`client/src/pages/AuthorizationHub.tsx:7-12` says the quiet part out loud:

> All provider flows below are UI shells. Real OAuth app credentials … must be configured in your environment / secrets vault before these buttons can complete a live auth flow.

There are no tRPC calls in the file. "Connected" state lives in
`useState` and is wiped on refresh. The "Save Key" button doesn't persist
anywhere — it just updates local state. There's a literal "Simulate
Connect" button.

### 1.10 `MasterControl.tsx` Kai panel is local-only

`client/src/pages/MasterControl.tsx:1410`:

> Local mock command surface, ready to wire to backend command execution.

The `runKaiCommand` handler appends to `chatMessages` state. No tRPC
call. The rest of MasterControl (status, snapshot, claimOwnerAccess, etc.)
is real; only the Kai chat tab is mocked.

---

## 2. Tenant-isolation issues (multi-tenancy violation)

CLAUDE.md is explicit: _"every query that touches tenant data must filter
by tenantId"_. The MCP-proxy routers below take `tenantId` from
**client input** instead of `ctx.user.tenantId`:

- `server/routers/dealflow.ts:17,54,75` — `listDeals`, `searchDeals`, `getRecommendations`
- `server/routers/pixelforge.ts:17,49` — `listAssets`, `createAsset`
- `server/routers/terpforge.ts` — `listCompounds` etc. (similar pattern)
- `server/routers/knowledgeGraph.ts` — graph query procedures

In `server/lib/mcpClient.ts:189-205`, `normalizeMcpToolArguments` only
enforces a tenantId when callers pass `authoritativeTenantId` in the
options bag. None of the routers above pass it, so the user-supplied
`tenantId` is forwarded verbatim to the MCP worker. **Any authenticated
user can query/mutate data in any tenant** by setting `tenantId` in the
input.

**Fix:** change each router to pass
`{ authoritativeTenantId: ctx.user.tenantId }` and drop the
`tenantId` field from the input schema.

---

## 3. Trigger-event coverage is asymmetric

`server/routers/automation.ts:16-32` advertises **15 trigger events**
to operators (lead.submitted, order.created, payment.succeeded,
subscription.activated, social.post.published, referral.converted, …).

A grep of `fireAutomations` shows only **leads.ts** actually fires:

- `lead.submitted` (line 199)
- `lead.status.<status>` (line 277)

`order.created`, `payment.succeeded`, `subscription.activated/cancelled`,
`social.post.published`, and `referral.converted` are listed in the UI
selector but **no producer ever calls `fireAutomations` with those event
names.** A user can save an n8n/Zapier hook on
`order.created` and it will never fire.

---

## 4. Stripe background webhook handler is partial

`netlify/functions/stripe-webhook-background.mts` only switches on
`customer.subscription.{created,updated,deleted}` and `invoice.{payment_succeeded,payment_failed}`.
All other event types are logged and dropped. The file's own TODO and
`POST_LAUNCH_ROADMAP.md:75` flag this:

> Move credit top-up handling (currently synchronous in `server/billing.ts`) to this background function.

This is a deliberate post-launch optimization, not a bug, but it's worth
listing because the duplicate webhook endpoint exists in the repo.

---

## 5. Things flagged in PLAN.md / POST_LAUNCH_ROADMAP.md / TODO.md

Verified status as of HEAD on this branch:

| Item                                                        | PLAN/TODO claim                                      | Reality                                                                                                                                                    |
| ----------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Analytics dashboard not rendering topProducts/webhookEvents | PLAN.md Unit 2                                       | **Already wired** (Analytics.tsx:71-72, lines 296+ render them)                                                                                            |
| `<ChangePlanCard />` for in-place plan switching            | TODO.md "no in-place flow yet"                       | **Already shipped** (`client/src/components/ChangePlanCard.tsx`, mounted at Billing.tsx:587). TODO.md is stale.                                            |
| `customers.notes` column missing                            | TODO.md non-blocking item                            | **Already restored** (PR `d01099e`)                                                                                                                        |
| `meta_capi_events` and `n8n_schedules` tables missing       | POST_LAUNCH_ROADMAP.md:34-37                         | **Already in `drizzle/schema.ts`** at lines 1193 and 1215. Roadmap doc is stale.                                                                           |
| `IncomeCalculator` not surfaced                             | TODO.md:145                                          | **Surfaced** at `client/src/pages/Referrals.tsx:414`                                                                                                       |
| Mailchimp integration                                       | POST_LAUNCH_ROADMAP.md "Stub"                        | **Real** — `automation.ts:227-248` issues a live HTTP `/3.0/ping` against the Mailchimp API. Test connection works; audience sync is what's still planned. |
| Zapier app submission pending                               | POST_LAUNCH_ROADMAP.md "Stub"                        | **Webhook hooks work** end-to-end via `automation.ts:131-186`; outstanding piece is publishing UnifyOne as an official Zapier app.                         |
| Mobile cron parser                                          | `mobileAutomation.ts:21` "Simple next-run estimator" | Confirmed — only handles `m h * * *` style entries. Anything more complex returns null.                                                                    |

---

## 6. What's working well

To balance the picture:

- **Auth** is fully migrated off Supabase — scrypt + jose HS256 JWT in cookie, `passwordChangedAt` JWT kill-switch, email verification, password reset, account deletion all wired.
- **Stripe / PayPal / Shopify / Square** webhook receivers all verify signatures correctly (lines per integration: `stripe.ts:540`, `paypal.ts:422`, `shopify.ts:468/564`, `square.ts:205`).
- **Multi-tenancy** is correctly enforced everywhere except the MCP-proxy routers in §2.
- **45+ tRPC routers** — nearly all are real CRUD against Drizzle/Neon. Spot-check of orders, products, customers, subscription, billing, gigWorker, gamification, governance, leads, kaiCredits, etc. shows live DB writes.
- **Test coverage** is broad: 538 unit tests pass cleanly.

---

## 7. Recommended next steps (rough priority)

1. **§2 (tenant isolation)** is a security bug — fix before adding more MCP-proxy routers. Mechanical change: add `{ authoritativeTenantId: ctx.user.tenantId }` to every `mcpCallTool` call site.
2. **§3 (event coverage)** — wire `fireAutomations(tenantId, "order.created", payload)` into `orders.ts`'s create handler, and similar for payment/subscription/social/referral. The `fireAutomations` helper already supports any event name.
3. **§1.1 / §1.2 (social)** — either delete the social posting/connect UI or implement the OAuth + posting backends. As shipped it is a vapor feature.
4. **§1.3 (n8n)** — either persist incoming events into `webhook_events` (one line) or stop advertising the URL in the Developer Hub.
5. **§1.4 (Billing fetch routes)** — implement `registerBillingFetchRoutes` for Netlify, or remove the `null` re-export and the conditional in `nonTrpcRoutes.ts`.
6. **§1.8 (clipper default)** — change the engine default from `"stub"` to `"basic"` in `createJobInput` so production callers don't get synthetic clips.
7. **Doc hygiene** — `TODO.md` and `POST_LAUNCH_ROADMAP.md` carry stale items (§5). One pass to mark them ✅ would prevent future audits from chasing them.
