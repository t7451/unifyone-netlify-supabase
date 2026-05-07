# Supabase Removal Summary

## What Changed

### Files Modified

1. **`client/src/_core/hooks/useAuth.ts`**
   - ❌ Removed `supabase.auth.signOut()` call
   - ❌ Removed `import { supabase }`
   - ✅ Logout now only calls server endpoint (which clears the cookie)

2. **`client/src/pages/AuthCallback.tsx`**
   - ❌ Removed all Supabase magic-link/PKCE/session exchange logic
   - ✅ Simplified to just redirect to `returnTo` or `/login` on error
   - ✅ Email verification handled by dedicated `/verify-email` route
   - ✅ Password reset handled by dedicated `/reset-password` route

3. **`server/_core/customAuth.ts`**
   - ✅ Added auto-verify on signup when `RESEND_API_KEY` is not set
   - ✅ Skip email verification requirement on signin when `RESEND_API_KEY` is not set
   - ✅ Added `hasEmailService` check in both `signUp()` and `signIn()`

4. **`.env.example`**
   - ✅ Updated Supabase section: "OPTIONAL — only needed for Realtime push notifications"
   - ✅ Clarified that Supabase is NOT required for authentication
   - ✅ Updated RESEND_API_KEY: "OPTIONAL. If not set, email verification is skipped"

5. **`AUTHENTICATION.md`** (NEW)
   - ✅ Comprehensive documentation of auth system
   - ✅ Explains email verification bypass behavior
   - ✅ Documents all auth endpoints and security features

## What Still Uses Supabase (as of 2026-04-25)

The "removal" was scoped to **authentication** only. Supabase is still load-bearing
in the data layer for credits and Stripe object storage. **Future agents: do NOT
delete Supabase env vars without finishing the migration in
and .**

### Auth — fully migrated off Supabase

- — server cookie only
- — no PKCE/magic-link
- — JWT/scrypt over Drizzle/Neon

### Credits — STILL on Supabase

- — calls supabase.rpc("consume_credits_with_meter", ...)
- Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
- Backed by a Postgres function on the Supabase project (denxakpahfmlsekxmubs)
- To migrate: port the RPC logic to a Drizzle transaction over credit_transactions
  on Neon. Function-side state currently lives only in Supabase.

### Stripe object storage — STILL on Supabase

- — upserts to Supabase tables stripe_subscriptions,
  stripe_products, stripe_prices
- Same Supabase project as credits
- To migrate: schema for these tables lives in
  scripts/supabase-stripe-subscriptions.sql. Replicate to Drizzle (drizzle/schema.ts),
  rewrite the upsert calls, run a one-time data sync.

### Real-time / push — STILL on Supabase (optional)

- ,
- Gracefully degrades if env vars are absent
- Live updates / presence only — not load-bearing for any signup/payment flow

### Legacy compat — can remove

- /api/auth/supabase-session — kept for backward compat, no caller

### Required env vars (do not delete)

- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY — credits + stripe.ts
- SUPABASE_JWT_SECRET — was the JWT_SECRET fallback in server/\_core/env.ts:10. Once
  JWT_SECRET is set explicitly (it is, as of 2026-04-25), this is only used for any
  direct Supabase-issued token verification. Safe to keep until credit/stripe
  migration completes.
- VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY — client-side realtime client

## Testing the Changes

### Without Supabase (Development Mode)

1. **Do NOT set** `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`
2. **Do NOT set** `RESEND_API_KEY` (auto-verify will activate)
3. Set `JWT_SECRET` and `DATABASE_URL`
4. Run the app:
   ```bash
   pnpm dev
   ```
5. Go to `/signup` → create account → you're signed in immediately (no email verification required)

### With Email Service (Production Mode)

1. Set `RESEND_API_KEY` to your Resend API key
2. Set `JWT_SECRET` and `DATABASE_URL`
3. Run the app
4. Go to `/signup` → create account → check email for verification link → click link → sign in

### With Supabase Realtime (Full Features)

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Set `JWT_SECRET`, `DATABASE_URL`, and `RESEND_API_KEY`
3. Run the app
4. Real-time features (live updates, presence) will work

## What Users Will Experience

### Before (Supabase Required)

- ❌ Login fails if Supabase env vars not set
- ❌ Logout fails with network errors to placeholder.supabase.co
- ❌ AuthCallback hangs waiting for Supabase session exchange

### After (Supabase Optional)

- ✅ Login works with just `JWT_SECRET` + `DATABASE_URL`
- ✅ Logout always works (just clears cookie)
- ✅ AuthCallback redirects gracefully without Supabase
- ✅ Email verification auto-bypassed if no email service configured
- ✅ Supabase only needed for real-time features (optional)

## Migration Path for Existing Users

### If you're NOT using Supabase Realtime

1. Remove `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your env
2. Keep `JWT_SECRET` and `DATABASE_URL`
3. Optionally set `RESEND_API_KEY` for email verification
4. That's it! Login will work without Supabase

### If you ARE using Supabase Realtime

1. Keep `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Login will use custom auth (email/password)
3. Realtime subscriptions will continue to work via Supabase client

## Alternative Auth Providers

### Clerk (Recommended for Production OAuth)

1. Set `CLERK_SECRET_KEY` in `.env`
2. Add Clerk SDK to frontend
3. After Clerk authenticates user, call `POST /api/auth/clerk` with session token
4. Server verifies with Clerk API and issues app session cookie

### Firebase

1. Set `FIREBASE_PROJECT_ID` and `FIREBASE_API_KEY`
2. Add Firebase SDK to frontend
3. After Firebase authenticates user, call `POST /api/auth/firebase` with ID token
4. Server verifies with Firebase Admin SDK and issues app session cookie

## Next Steps (Optional)

1. **Remove legacy endpoint**: Delete `/api/auth/supabase-session` from `server/_core/oauth.ts` if not needed
2. **Add OAuth**: Wire up Clerk or Firebase for social login (Google, GitHub, etc.)
3. **Add magic links**: Implement passwordless login via email (can reuse existing email infrastructure)
4. **Add 2FA**: Add TOTP support for enhanced security

---

## Supabase Migration Sprint — concrete plan (drafted 2026-05-06)

The remaining Supabase footprint is two load-bearing call sites and one optional realtime client. Migrating to Drizzle/Neon eliminates 6 required env vars and one external dependency. Estimated 2–3 days of focused work. Ship in three sequential PRs so each can revert cleanly.

### Sprint 1 — Credits RPC port (1 day)

**Target call site:** `server/creditMeter.ts:34,103-110`

- [ ] Capture the current Supabase Postgres function definition. Source it from the Supabase dashboard SQL editor (project `denxakpahfmlsekxmubs`) and commit as `drizzle/0042_credits_rpc.sql` for reference.
- [ ] Port `consume_credits_with_meter` to a Drizzle transaction: read balance → guard against overdraw → insert `credit_transactions` row → return new balance. Atomic in a single `db.transaction()`. **Concurrency requirement:** the balance read must be row-locked to prevent two concurrent requests from each seeing sufficient balance and both succeeding (classic overdraw race). Use `SELECT … FOR UPDATE` against the tenant's balance row inside the transaction, or set the transaction isolation level to `SERIALIZABLE` and retry on serialization failure. The current Supabase function relies on Postgres' MVCC inside its own transaction; the Drizzle port must replicate that guarantee explicitly.
- [ ] Replace `supabase.rpc("consume_credits_with_meter", ...)` with the new helper. Delete `_supabase` client init from `creditMeter.ts`.
- [ ] Add a Vitest covering: sufficient balance path, insufficient balance path, **concurrent call serialization (two parallel debits against the same tenant exhausting balance)**, and idempotency on `(tenantId, idempotencyKey)`.
- [ ] One-time data sync: snapshot Supabase `credit_transactions` → import into Neon. Run dry-run first, then cutover during a maintenance window.

### Sprint 2 — Stripe object storage port (1 day)

**Target call site:** `server/stripe.ts:8,42-43,302-303`

- [ ] Replicate the Supabase tables `stripe_subscriptions`, `stripe_products`, `stripe_prices` into `drizzle/schema.ts`. Reference SQL is in `scripts/supabase-stripe-subscriptions.sql`.
- [ ] Generate migration via `pnpm drizzle-kit generate` and commit as `drizzle/0043_stripe_objects.sql`.
- [ ] Rewrite the Supabase upserts in `server/stripe.ts` as Drizzle `onConflictDoUpdate` calls. Drop `getSupabaseAdmin()` from this file once both call sites are gone.
- [ ] One-time data sync from Supabase → Neon for existing rows.
- [ ] Apply the migration in prod via the `Apply production migration` Action.

### Sprint 3 — Realtime + env cleanup (½ day)

- [ ] Decide on realtime: keep Supabase Realtime as an optional dependency, or replace with native server-sent events / Pusher / Cloudflare Durable Objects. Default recommendation: keep as optional-only, gated on `VITE_SUPABASE_URL` presence (already the current behavior).
- [ ] Delete `/api/auth/supabase-session` legacy endpoint from `server/_core/oauth.ts`.
- [ ] Drop `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` from `.env.example` server section. Keep `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` only if realtime is staying.
- [ ] Remove `@supabase/supabase-js` from `package.json` if realtime is removed; otherwise keep but downgrade comment to "client-only realtime".
- [ ] Update `CLAUDE.md` "Persistence stack" table — drop the credit-meter and Stripe-storage rows from the Supabase column.
- [ ] Update `SUPABASE_REMOVAL.md` to mark sprints 1 + 2 complete.

### Cutover safety

1. Each sprint ships behind a feature flag (env var `USE_NEON_CREDITS=1` etc.) for ~24h before the Supabase code path is deleted.
2. Keep Supabase env vars set during the rollover window — code will read from Neon but the old client init must not crash if Supabase env vars are absent.
3. Verify both `/api/health` and the in-app credit balance UI before deleting the Supabase code.
