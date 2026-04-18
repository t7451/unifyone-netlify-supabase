-- Bootstrap schema for UnifyOne (apps/unifyone).
-- Mirrors apps/unifyone/src/lib/db/schema.ts. Run once against a fresh
-- Neon database. Safe to re-run: all creates are IF NOT EXISTS.

create extension if not exists pgcrypto;

-- users: clerk user id as primary key
create table if not exists users (
  id text primary key,
  email text not null unique,
  org_id text,
  tier text not null default 'free',
  created_at timestamptz not null default now()
);

-- api_keys: one row per issued API key for a user
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  key_hash text not null,
  prefix text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

-- credit_ledger: append-only ledger of kai credit movements
create table if not exists credit_ledger (
  id bigserial primary key,
  user_id text not null references users(id),
  delta integer not null,
  reason text not null,
  ref_id text,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_created_idx
  on credit_ledger (user_id, created_at);

-- waitlist: marketing-site opt-ins (email as PK for conflict-free inserts)
create table if not exists waitlist (
  email text primary key,
  source text,
  utm jsonb,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness: the API normalizes on write, and this index
-- prevents Alice@ and alice@ ever coexisting if normalization regresses.
create unique index if not exists waitlist_email_lower_idx
  on waitlist (lower(email));
