-- Shopify OAuth Hardening
-- Encrypted tokens at rest + DB-backed CSRF state for OAuth install
-- Existing rows keep plaintext until re-auth or scripts/migrate-shopify-tokens.mts runs.

alter table public.shopify_stores
  alter column "accessToken" drop not null;

alter table public.shopify_stores
  add column if not exists "accessTokenEnc" text;

alter table public.shopify_stores
  add column if not exists "tokenCipherVersion" smallint default 1;

alter table public.shopify_stores
  drop constraint if exists shopify_stores_token_present;

alter table public.shopify_stores
  add constraint shopify_stores_token_present
  check (
    status <> 'active'
    or "accessTokenEnc" is not null
    or "accessToken" is not null
  );

create table if not exists public.shopify_oauth_states (
  state         text primary key,
  shop          text not null,
  "userId"      integer,
  "tenantId"    integer,
  "createdAt"   timestamptz not null default now(),
  "expiresAt"   timestamptz not null default now() + interval '10 minutes'
);

create index if not exists idx_shopify_oauth_states_expires
  on public.shopify_oauth_states ("expiresAt");

create index if not exists idx_shopify_oauth_states_shop
  on public.shopify_oauth_states (shop);

-- Optional cleanup cron:
--   delete from public.shopify_oauth_states where "expiresAt" < now() - interval '1 hour';
-- No RLS: only touched by service role.
