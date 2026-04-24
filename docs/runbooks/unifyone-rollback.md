# UnifyOne Rollback — Panic Button

**Runnable from phone.** Single action. Takes < 5 minutes.

---

## When to trigger

Rollback if **any** of these appear within 24h of the cutover:

- Error rate > 1% on the new site for > 10 minutes
- `06:verify` parity check retroactively fails
- Clerk webhook is silently dropping users (Neon `users` count stops growing while Clerk user count grows)
- SSL / cert error blocking > 50% of traffic
- You are genuinely unsure whether data integrity holds

Rollback is **always safe** — the legacy site is deployed and ready. The cost of a spurious rollback is zero users affected; the cost of leaving a broken cutover in place is real user impact.

---

## The single action

1. **Cloudflare dashboard** → `1commerce.online` → DNS
2. Edit the apex record (and `www`) → repoint target to `{old-site}.netlify.app`
3. Save

TTL on the cutover record was set to 300s. Propagation completes in 5 minutes worldwide.

If you have the Cloudflare mobile app, you can do this from your phone.

---

## Verify rollback

After 5 minutes:

```bash
curl -s https://1commerce.online | head -40
```

You should see the legacy SPA's HTML (React shell, `<div id="root">`, etc.), not the Astro hero. If the Astro hero still appears, DNS hasn't propagated — wait another minute.

---

## What gets preserved across a rollback

- **Supabase:** untouched throughout the migration. All legacy data intact.
- **Neon:** the Neon data is additive (`insert ... on conflict do nothing` and `insert ... select ... join mapping`). Nothing was deleted. Leaving the data in Neon has zero impact on the legacy site since the legacy site doesn't read from Neon.
- **Clerk users:** the users created by `03_clerk_bulk_import.ts` remain in Clerk. Since the legacy site uses Supabase Auth, they're dormant until a future retry.

**There is no data loss from a rollback.**

---

## After rollback — triage checklist

1. **Capture evidence.** Screenshot Clerk webhook logs, Netlify function logs, Neon query console, anything unusual.
2. **Inspect Neon for partial writes:**

   ```sql
   select count(*) from _migration_user_map;
   select count(*) from waitlist;
   select count(*) from credit_ledger;
   select count(*) from _migration_credit_ledger_staging;
   ```

   Compare to your dry-run numbers. Any gap is a clue.

3. **Decide retry vs. pause.** If the root cause is clear and local (e.g., Clerk webhook misconfigured), fix and retry after a cooldown. If unclear, pause the migration, post to whatever channel tracks this work, and return after rest.

4. **Truncate migration staging** if you want a clean slate for the next attempt:

   ```sql
   truncate _migration_waitlist_staging;
   truncate _migration_credit_ledger_staging;
   -- Do NOT truncate _migration_user_map — it's the mapping of Clerk users already created.
   -- If you need to start fully fresh, you must also delete the Clerk users or the next 03:clerk will reuse them.
   ```

5. **Do not delete anything from `waitlist` or `credit_ledger`.** If a user has already signed up to the new site (between cutover and rollback), their row is real data. Leave it.

---

## What NOT to do during rollback

- **Don't touch Supabase.** It's the safety net. Leave it alone.
- **Don't delete Clerk users.** Even if the cutover failed, they'll be reused on retry.
- **Don't delete Neon data.** The `_migration_*` tables are your audit trail.
- **Don't delete either Netlify site.** Both need to stay deployed for another retry.

---

## Escalation

If all of these are true — rollback didn't resolve the user-facing issue, Cloudflare propagation is confirmed, the legacy site is reachable via its `.netlify.app` URL directly — then DNS isn't the problem. Something at the Cloudflare / domain / registrar layer is. Check:

- Cloudflare proxy status (orange cloud should be on)
- Domain registrar's nameservers still point to Cloudflare
- No recent Cloudflare WAF / firewall rules blocking traffic
- No recent Netlify "publishing suspended" emails

If the domain itself is down at the registrar layer, that's outside the scope of the cutover — handle as a standard domain incident.
