# UnifyOne Cutover Runbook

**Goal:** Move `1commerce.online` from the legacy Supabase-backed SPA to the Astro + Clerk + Neon app at `apps/unifyone/`, without data loss and with a 5-minute rollback available for 30 days.

**Audience:** Keith (operator). Read top to bottom before starting.

**Estimated duration:** 30–60 minutes of migration window + 24h of passive monitoring.

---

## Prerequisites — verify before T-24h

- [ ] Batch 01 merged to `main`
- [ ] `apps/unifyone/` deploys cleanly to a Netlify preview URL
- [ ] Preview URL passes the 6-issue SEO audit (sitemap, robots, content, H1, headings, canonical)
- [ ] `NEON_DATABASE_URL` points at a Neon branch with Drizzle schema applied (`pnpm --filter unifyone db:push`)
- [ ] Clerk app created, `CLERK_SECRET_KEY` + `PUBLIC_CLERK_PUBLISHABLE_KEY` in Netlify env
- [ ] Clerk webhook `user.created` / `user.updated` / `user.deleted` → `/api/clerk-webhook` fires successfully (test by signing up a throwaway account on preview; `select count(*) from users` in Neon increments)
- [ ] Latest Supabase backup downloaded (dashboard → Database → Backups → Download)
- [ ] `pg_dump` / `psql` v16+ on the workstation running migration
- [ ] `infra/migration/.env` populated
- [ ] MailerLite "we're upgrading" email drafted and scheduled for T-24h (see template below)

If any box is unchecked, **stop and resolve first.**

---

## T-24h — freeze + announce

1. **Banner on legacy site.** Edit `t7451/unifyone-netlify-supabase` (or whichever repo deploys production), add a top banner:

   > "Platform upgrade in progress. New signups paused for 24 hours — existing users can continue using the site."

   Deploy to production. This is the **only** change to the legacy site.

2. **Disable new signups on legacy.** Either feature-flag the signup page off or disable email signup in Supabase Auth.

3. **Send MailerLite email.** Template:

   > Subject: We're upgrading — heads up on your next sign-in
   >
   > Hey,
   >
   > On [date], we're moving 1commerce.online to a new auth system. Next time you sign in, use the **magic link** option — we'll email you a login link, no password needed. Your existing account, waitlist entry, and any credit balance come with you.
   >
   > Questions → hit reply.
   > — The UnifyOne team

4. **Announce internally** to anyone who monitors the domain (if applicable).

---

## T-0 — migration window

Pick a low-traffic window (Sunday morning PT is ideal).

### Step 1: dry run (read every output)

```bash
cd infra/migration
cp .env.example .env
# Fill in SUPABASE_DB_URL, NEON_DATABASE_URL, CLERK_SECRET_KEY
pnpm install

export DRY_RUN=true
pnpm 01:export            # produces exports/ — review row counts
pnpm 02:audit             # MUST print "Audit PASSED ✓" — if not, stop
pnpm 03:clerk             # simulation only — skim the "[DRY RUN] would create" log
pnpm 05:import            # simulation — confirm waitlist/credit counts look right
# 04:map and 06:verify are skipped in dry run (they need real mapping / writes)
```

If anything looks off, **stop here.** Dry run is your last safe checkpoint.

### Step 2: apply Neon migration helpers

```bash
psql "$NEON_DATABASE_URL" -f ../neon/0002_migration_helpers.sql
```

Idempotent. Safe to re-run.

### Step 3: live run

```bash
export DRY_RUN=false

# Clerk writes — takes ~1 req/50ms per user at default CLERK_RPS=15.
# 1,000 users ≈ 70 seconds. 10,000 users ≈ 12 minutes.
pnpm 03:clerk

# Wait for Clerk webhook to backfill Neon `users` table.
# Webhook is async but typically completes within seconds of each create.
# Confirm: select count(*) from users; should equal Clerk dashboard user count.

pnpm 04:map               # persists _migration_user_map
pnpm 05:import            # loads waitlist + credit_ledger
pnpm 06:verify            # MUST print "Verification PASSED ✓"
```

If `06:verify` fails:

- **Stop.** Do not proceed to DNS flip.
- Read the failure report. Every check prints what it checked and the actual values.
- Common causes: Clerk webhook lag (wait, re-run 04:map), orphaned credits (review `exports/orphaned_credits.jsonl`).
- Re-run the failing step. All scripts are idempotent / additive.

---

## T+1h — DNS flip

### Pre-flight on new site

- [ ] Preview URL renders homepage with hero "Your AI knows what you actually earn"
- [ ] `/sign-in` renders Clerk widget (not a 404)
- [ ] `/api/waitlist` returns `{ ok: true }` for a test POST
- [ ] SSL active on the Netlify site for the custom domain (Netlify → Domain settings → HTTPS)

### Netlify — claim the domain

1. **New site** (`apps/unifyone/` deploy):
   - Domain settings → **Add custom domain** → `1commerce.online` (and `www.1commerce.online`)
   - Enable **Force HTTPS**
   - Wait for Netlify to provision the Let's Encrypt cert (usually 1–2 minutes after DNS propagates)

2. **Old site** (legacy SPA):
   - Domain settings → **Remove custom domain** for `1commerce.online` and `www.1commerce.online`
   - Leave the site deployed at `{old-site-name}.netlify.app` — **do not delete**
   - Do not unlink the repo

### Cloudflare — repoint the record

1. Cloudflare dashboard → `1commerce.online` → DNS
2. Locate the apex record pointing at the old Netlify site
3. **Edit** → repoint to the new site:
   - If old record was `CNAME` to `{old-site}.netlify.app`, change target to `{new-site}.netlify.app`
   - If old record was `A` records to Netlify's apex IPs, those IPs are unchanged across Netlify sites (Netlify uses a shared load balancer) — you only need to update CNAME if one exists
4. **TTL: 300s** for the cutover window. Save.
5. Repeat for the `www` record.

### Verify the flip

Wait 2–5 minutes for DNS propagation, then:

```bash
# Should return Netlify headers from the NEW site (check x-nf-request-id matches new deploy)
curl -sI https://1commerce.online | grep -iE "server|x-nf"

# Should return the Astro hero, not the SPA loading shell
curl -s https://1commerce.online | grep -i "your ai knows"

# Sitemap and robots reachable
curl -s https://1commerce.online/sitemap.xml | head -5
curl -s https://1commerce.online/robots.txt
```

If any of these fail, proceed to [rollback](./unifyone-rollback.md).

---

## T+1h to T+24h — monitor

Keep these tabs open for 24 hours:

- **Clerk dashboard** → Users + Webhooks (watch for failures)
- **Neon console** → queries on `users`, `waitlist`, `credit_ledger`
- **Netlify** → Deploys + Functions logs for the new site
- **Cloudflare Analytics** → traffic split confirmation + error codes
- **Sentry / error monitor** (if configured) → any new 5xx

Quick checks every 2 hours:

```bash
# Error rate
curl -sI https://1commerce.online | head -1   # expect HTTP/2 200

# Cookie-based Clerk load works
curl -s https://1commerce.online/sign-in | grep -c "clerk"   # expect >0

# Waitlist write still works end-to-end
curl -s -X POST https://1commerce.online/api/waitlist \
  -H 'content-type: application/json' \
  -d '{"email":"cutover-smoke-test@example.com","source":"smoke-test"}'
```

Delete the smoke-test row afterward: `delete from waitlist where email = 'cutover-smoke-test@example.com';`

---

## T+24h — confirm stable

- [ ] Zero 5xx errors in the past hour on the new site
- [ ] At least one real (non-smoke-test) magic-link signup succeeded end-to-end
- [ ] At least one real login by a migrated user succeeded via magic link
- [ ] Lighthouse mobile: Performance ≥ 95, SEO = 100, Accessibility ≥ 95, Best Practices ≥ 95
- [ ] Search Console: submit `https://1commerce.online/sitemap.xml` (accelerates crawl)
- [ ] Rich Results test passes on `/` (Organization, WebSite, FAQPage) and one blog post (Article)
- [ ] **Raise Cloudflare TTL back to 3600s** for both apex and `www` records

If all boxes tick, the cutover is complete. Start the T+30d timer.

---

## T+30d — decommission

1. Confirm 30 days of stable traffic on new site — no rollbacks, no emergency patches.
2. Run final parity check: `pnpm 06:verify` (should still pass).
3. **Drop migration helpers** in Neon:

   ```sql
   drop table if exists _migration_user_map;
   drop table if exists _migration_waitlist_staging;
   drop table if exists _migration_credit_ledger_staging;
   ```

4. **Archive the legacy repo.** On GitHub, `t7451/unifyone-netlify-supabase` → Settings → Archive. Do **not** delete.
5. **Pause the Supabase project** (dashboard → Project Settings → Pause). Pausing preserves all data for 90 days; deletion is T+90d.
6. **Unlink the old Netlify site** from its repo or delete it. At this point the old site has been disconnected from DNS for 30 days; no traffic reaches it.
7. Update `docs/runbooks/unifyone-cutover.md` (this file) with the actual cutover date and any deviations, for the next team member who touches the migration pattern.

---

## MailerLite email template

Store this in MailerLite as a draft so T-24h is a one-click send.

**Subject:** Heads up — new sign-in on 1commerce.online

**Body:**

> Hey,
>
> On [DATE], we're upgrading the platform. Here's what you need to know:
>
> **Your account travels with you.** Email, waitlist entry, credit balance — all preserved.
>
> **Next sign-in uses a magic link.** Instead of a password, we'll email you a login link. Faster, and no password to remember. If you had a password before, you don't need it anymore.
>
> **Nothing to do right now.** Just sign in next time and follow the prompts.
>
> Questions? Hit reply.
>
> — The UnifyOne team
