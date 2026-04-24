-- Migration helper tables for the Supabase → (Clerk + Neon) cutover.
-- Applied once before running infra/migration scripts. Idempotent.
-- Dropped at T+30d via docs/runbooks/unifyone-cutover.md decommission step.

-- Mapping table: Supabase auth.users.id → Clerk user id.
-- Populated by 04_build_user_mapping.ts. Queried by 05_transform_and_import.ts
-- to remap any table that references the legacy supabase uid.
create table if not exists _migration_user_map (
  supabase_uid   uuid primary key,
  clerk_user_id  text not null unique,
  email          text not null,
  mapped_at      timestamptz not null default now()
);

create index if not exists _migration_user_map_email_idx
  on _migration_user_map (email);

-- Staging table for raw waitlist import before de-dup against the live table.
-- Truncated and reloaded on each run of 05_transform_and_import.ts.
--
-- utm is `text` here (not jsonb) so the load step can stream straight from
-- pg_dump output — we JSON.stringify in TS and cast to jsonb when copying
-- from staging → live, which is the only place the type actually matters.
create table if not exists _migration_waitlist_staging (
  email       text,
  source      text,
  utm         text,
  created_at  timestamptz
);

-- Staging table for raw credit_ledger rows before user remap.
-- Truncated and reloaded on each run of 05_transform_and_import.ts.
--
-- legacy_id is `text` so it round-trips without JS-side bigint conversion.
-- It's only read back for operator review in orphaned_credits.jsonl; we
-- never do arithmetic on it.
create table if not exists _migration_credit_ledger_staging (
  legacy_id     text,
  supabase_uid  uuid,
  delta         integer,
  reason        text,
  ref_id        text,
  created_at    timestamptz
);
