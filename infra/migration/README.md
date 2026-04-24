# @1commerce/migration

Supabase → (Clerk + Neon) migration tooling for UnifyOne Batch 02 cutover.

These scripts are **operator tools**. They do not run in CI and are not deployed.
Run them from a workstation during the cutover window described in
`docs/runbooks/unifyone-cutover.md`.

## Prerequisites

- Node 22+, pnpm 10
- `psql` + `pg_dump` v16+ (PostgreSQL client tools) on PATH
- Network reachability to Supabase DB, Neon DB, and Clerk API
- `.env` populated — copy from `.env.example`

## Safety model

Every script respects `DRY_RUN=true` in the environment. The first pass of the
cutover always runs dry — you read the audit, review the planned Clerk creates,
and only then flip `DRY_RUN=false`.

All Neon writes are additive (`insert ... on conflict do nothing` or
`insert ... select ... join mapping`). No script issues `delete from`, `drop`,
or `truncate` against the live schema. The `_migration_*` helper tables exist
for staging and are dropped at T+30d after parity is confirmed.

## Sequence

| Step | Script           | Writes to                                                          |
| ---: | ---------------- | ------------------------------------------------------------------ |
|   01 | `pnpm 01:export` | `exports/auth_users.csv`, `exports/app_data.sql`                   |
|   02 | `pnpm 02:audit`  | stdout only (exits non-zero on schema violation)                   |
|   03 | `pnpm 03:clerk`  | Clerk (live, unless `DRY_RUN=true`) + `exports/user_mapping.jsonl` |
|   04 | `pnpm 04:map`    | Neon `_migration_user_map`                                         |
|   05 | `pnpm 05:import` | Neon `waitlist`, `credit_ledger`; `exports/orphaned_credits.jsonl` |
|   06 | `pnpm 06:verify` | stdout + exit code                                                 |

Steps 01 and 02 are safe to run multiple times — they only read from Supabase
and produce local files. Step 03 is idempotent per-email (skips users that
already exist in Clerk). Steps 04–06 are idempotent on re-run (mapping rows
upsert, staging tables truncate+reload, parity check is read-only).

## Rollback

Migration is additive; rollback is a DNS flip. See
`docs/runbooks/unifyone-rollback.md`.

## What is NOT migrated

- `auth.users` passwords (Clerk issues magic-link flow on first login instead)
- `api_keys` rows (secrets rotate; users generate new keys post-cutover)
- Any column whose name contains `password`, `secret`, `token`, or `api_key`
  (`02_audit_export.ts` flags these and refuses to proceed if unexpected
  secret-shaped columns appear)
- Supabase storage objects (separate batch if/when needed)
- Supabase Edge Functions (ported to Astro API routes separately)
