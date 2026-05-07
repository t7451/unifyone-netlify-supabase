# Post-Launch Roadmap

Items in this document are intentionally deferred past the initial launch.
Nothing here is forgotten — these are tracked improvements with enough context
to implement after the platform is live and generating data.

---

## Phase 20 — Automated Challenge Completion

**Status:** Partially implemented — schema is missing required columns.

The challenge system (`gamification` module) has logic to resolve challenges, but
three columns required for automated completion tracking were not included in the
initial schema:

| Missing column   | Table        | Purpose                                                    |
| ---------------- | ------------ | ---------------------------------------------------------- |
| `resolvedAt`     | `challenges` | Timestamp when the challenge was closed/resolved           |
| `winnerNotified` | `challenges` | Flag — `true` once the winner has been emailed             |
| `loserNotified`  | `challenges` | Flag — `true` once the losing participant has been emailed |

**To implement:** Add a Drizzle migration adding these columns to the `challenges`
table, then wire the challenge-completion cron/webhook to set them.

---

## Phase 23 — Meta Conversions API (CAPI)

**Status:** ✅ Tables exist — both `meta_capi_events` and `n8n_schedules`
are defined in `drizzle/schema.ts` (lines 1193 and 1215 as of 2026-05-07).
What still remains is wiring `server/meta/capi.ts` to insert into
`meta_capi_events` before/after the Facebook forward — currently CAPI
emission is fire-and-forget without persistence.

---

## Incomplete Third-Party Integrations

The following integrations have placeholder code or are stubbed out. They are
intentionally deferred until there is sufficient user demand or budget for the
required API subscriptions.

| Integration     | Status                        | Notes                                                                                                                        |
| --------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Mailchimp**   | Live HTTP ping + saved config | `automation.ts:227-248` validates credentials against Mailchimp `/3.0/ping`; outstanding piece is two-way audience sync      |
| **Zapier**      | Webhook hooks live            | `automation.ts:131-186` issues outbound POSTs end-to-end; outstanding piece is publishing UnifyOne as an official Zapier app |
| **Plaid**       | Not started                   | Needed for bank account linking in the Money Manager                                                                         |
| **Google Maps** | Not started                   | Store location picker on the tenant settings page                                                                            |
| **Twilio**      | Not started                   | SMS notifications for order status updates                                                                                   |
| **SendGrid**    | Not started                   | Alternative email provider to Resend (for volume pricing)                                                                    |
| **Slack**       | Not started                   | Internal alerts (low stock, new order) to a Slack channel                                                                    |

---

## Planned Security Improvements

| Item                                | Priority | Notes                                                                                                                                                   |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Two-Factor Authentication (2FA)** | High     | TOTP-based 2FA for admin accounts. Requires `totp_secrets` table and a QR-code setup flow.                                                              |
| **Social Login**                    | Medium   | Google / GitHub OAuth as alternatives to email+password.                                                                                                |
| **GDPR Review**                     | High     | Data export (`/api/user/export`) and account deletion (`/api/user/delete`) endpoints are required for EU users. A cookie-consent banner is also needed. |
| **Refresh Token Rotation**          | Medium   | Current JWTs are long-lived (1 year). Implementing short-lived access tokens + refresh rotation would significantly reduce blast radius on token theft. |
| **Admin IP Allowlist**              | Low      | Restrict `/api/admin/*` endpoints to known IP ranges in production.                                                                                     |

---

## Stripe Webhook Background Handler

**File:** `netlify/functions/stripe-webhook-background.mts`

**Current state:** The background handler verifies the Stripe webhook signature
and logs every event, but only processes `customer.subscription.*` and
`invoice.*` events. All other event types are currently logged and ignored.

**Planned improvement:** Move credit top-up handling (currently synchronous in
`server/billing.ts`) to this background function. This will:

- Prevent Stripe from retrying due to slow fulfillment (> 30 s)
- Enable idempotent retry logic backed by the `stripe_events` table
- Decouple credit fulfillment from the main request path

**Priority:** Post-launch performance optimization — implement when webhook
volume exceeds ~500 events/day.

---

## Column Naming Inconsistency

The governance tables (`proposals`, `votes`, `compliance_requirements`, etc.)
use `snake_case` column names (e.g. `created_at`, `tenant_id`) because they
were generated from a separate schema file (`drizzle/governance-schema.sql`).
All other application tables use `camelCase` (e.g. `createdAt`, `tenantId`).

**Known inconsistency** — documented here to prevent confusion.

**Enforcement going forward:** All new table columns must use `camelCase` to
match the existing application convention.

**Future migration:** Renaming governance columns to `camelCase` is a
lower-priority item. It requires a coordinated schema migration, ORM updates,
and a search for any raw SQL queries that reference the old names.
