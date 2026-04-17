-- Migration: Golf Club Custom Studio
-- Created: 2026-04-17
-- Purpose: Backend for 3D golf club configurator — configs, orders, storage buckets
-- Database: PostgreSQL (Supabase)

-- ============================================================
-- Golf Club Custom Studio
-- ============================================================

create table if not exists public.golf_configs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  engraving_text  text,
  engraving_font  text,
  components      jsonb not null default '{}'::jsonb,
  leather_finish  text,
  logo_path       text,  -- storage path, not full URL
  tab_state       jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_golf_configs_user_id on public.golf_configs(user_id);

create table if not exists public.golf_orders (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references auth.users(id) on delete set null,
  config_id                uuid references public.golf_configs(id) on delete restrict,
  line_items               jsonb not null,
  subtotal_cents           integer not null,
  tax_cents                integer not null default 0,
  total_cents              integer not null,
  currency                 text not null default 'usd',
  stripe_payment_intent_id text unique,
  status                   text not null default 'pending'
                           check (status in ('pending','paid','fulfilled','refunded','failed')),
  glb_path                 text,  -- storage path once generated
  impact_click_id          text,  -- im_ref at time of order
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists idx_golf_orders_user_id on public.golf_orders(user_id);
create index if not exists idx_golf_orders_status on public.golf_orders(status);
create index if not exists idx_golf_orders_pi on public.golf_orders(stripe_payment_intent_id);

-- auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists golf_configs_updated_at on public.golf_configs;
create trigger golf_configs_updated_at
  before update on public.golf_configs
  for each row execute function public.set_updated_at();

drop trigger if exists golf_orders_updated_at on public.golf_orders;
create trigger golf_orders_updated_at
  before update on public.golf_orders
  for each row execute function public.set_updated_at();

-- RLS
alter table public.golf_configs enable row level security;
alter table public.golf_orders  enable row level security;

drop policy if exists "users read own configs"   on public.golf_configs;
drop policy if exists "users write own configs"  on public.golf_configs;
drop policy if exists "users update own configs" on public.golf_configs;
drop policy if exists "users read own orders"    on public.golf_orders;

create policy "users read own configs"
  on public.golf_configs for select
  using (auth.uid() = user_id);

create policy "users write own configs"
  on public.golf_configs for insert
  with check (auth.uid() = user_id);

create policy "users update own configs"
  on public.golf_configs for update
  using (auth.uid() = user_id);

create policy "users read own orders"
  on public.golf_orders for select
  using (auth.uid() = user_id);

-- Orders are inserted by service role only (via function). No user INSERT policy by design.

-- Storage buckets
insert into storage.buckets (id, name, public) values
  ('golf-logos', 'golf-logos', false),
  ('golf-glb',   'golf-glb',   false)
on conflict (id) do nothing;

drop policy if exists "users upload own logos" on storage.objects;
drop policy if exists "users read own logos"   on storage.objects;
drop policy if exists "users read own glbs"    on storage.objects;

create policy "users upload own logos"
  on storage.objects for insert
  with check (bucket_id = 'golf-logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users read own logos"
  on storage.objects for select
  using (bucket_id = 'golf-logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users read own glbs"
  on storage.objects for select
  using (bucket_id = 'golf-glb' and auth.uid()::text = (storage.foldername(name))[1]);
