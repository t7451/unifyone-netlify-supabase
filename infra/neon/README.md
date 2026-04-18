# Neon bootstrap

How to stand up a fresh Neon database for `apps/unifyone`.

## 1. Create the Neon project

1. Go to <https://console.neon.tech> → **Create project**.
2. Region: closest to Netlify build region (recommended `us-east-2`).
3. Postgres version: 16.
4. Copy the **pooled** connection string. It looks like:
   ```
   postgres://USER:PASS@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Paste it into:
   - Local `apps/unifyone/.env` → `NEON_DATABASE_URL=...`
   - Netlify preview site env UI → `NEON_DATABASE_URL=...`

## 2. Apply the schema

**Option A — raw SQL (fastest):**

```bash
psql "$NEON_DATABASE_URL" -f infra/neon/0001_init.sql
```

**Option B — Drizzle push (keeps things in sync with the TS schema):**

```bash
pnpm --filter unifyone db:generate   # writes drizzle/*.sql migrations
pnpm --filter unifyone db:push       # applies them to Neon
```

## 3. Verify

```bash
psql "$NEON_DATABASE_URL" -c "\dt"
```

Expect:

```
 public | api_keys      | table
 public | credit_ledger | table
 public | users         | table
 public | waitlist      | table
```

## Ongoing migrations

- Edit `apps/unifyone/src/lib/db/schema.ts` (the source of truth).
- Run `pnpm --filter unifyone db:generate` to produce a new migration file
  under `apps/unifyone/drizzle/`.
- Review the generated SQL, commit it, then `pnpm --filter unifyone db:push`
  (or run it in CI).

## Rollback

Neon supports point-in-time branching — prefer creating a branch before any
destructive change and running migrations against the branch first.

```
neonctl branches create --name pre-$(date +%Y%m%d)
```

## Do NOT

- Do not run these SQL files against the production Supabase database that
  currently backs `1commerce.online` — that database lives in the root of
  this repo and is untouched by this batch. Data migration from Supabase to
  Neon is the job of Batch 02.
