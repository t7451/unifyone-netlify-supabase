-- Spire Foundation tables (Batch 03).
-- Applied once after Batch 02 cutover. Idempotent. Table names all carry
-- the spire_ prefix so a future "separate schema" refactor is trivial.
--
-- Uses gen_random_uuid() from pgcrypto, which 0001_init.sql already enables.

create table if not exists spire_sites (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  domain             text not null,
  repo               text not null,
  content_path       text not null,
  brand_brief_key    text not null,
  niche              text not null,
  target_audiences   text[] not null,
  tier               text not null default 'foundation'
                     check (tier in ('foundation', 'revenue', 'systems', 'scale')),
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);

create table if not exists spire_keywords (
  id           uuid primary key default gen_random_uuid(),
  site_id      uuid not null references spire_sites(id) on delete cascade,
  term         text not null,
  cluster      text,
  intent       text check (intent in ('informational', 'commercial', 'transactional', 'navigational')),
  priority     integer not null default 50 check (priority between 0 and 100),
  status       text not null default 'new'
               check (status in ('new', 'planned', 'in_progress', 'published', 'rejected')),
  created_at   timestamptz not null default now(),
  unique (site_id, term)
);

create index if not exists spire_keywords_queue_idx
  on spire_keywords (site_id, status, priority desc);

create table if not exists spire_content_plan (
  id              uuid primary key default gen_random_uuid(),
  site_id         uuid not null references spire_sites(id) on delete cascade,
  keyword_id      uuid references spire_keywords(id) on delete set null,
  slug            text not null,
  target_keyword  text not null,
  title           text,
  brief           jsonb,
  content_md      text,
  word_count      integer,
  quality_score   integer check (quality_score between 0 and 100),
  quality_report  jsonb,
  status          text not null default 'queued'
                  check (status in ('queued', 'generating', 'review', 'published', 'failed')),
  error           text,
  attempts        integer not null default 0,
  commit_sha      text,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (site_id, slug)
);

create index if not exists spire_content_plan_queue_idx
  on spire_content_plan (site_id, status, created_at);

-- updated_at auto-maintenance
create or replace function _spire_touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists _spire_content_plan_touch on spire_content_plan;
create trigger _spire_content_plan_touch
  before update on spire_content_plan
  for each row execute function _spire_touch_updated_at();

create table if not exists spire_runs (
  id            bigserial primary key,
  site_id       uuid references spire_sites(id) on delete set null,
  trigger       text not null check (trigger in ('scheduled', 'manual', 'backfill')),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  planned       integer not null default 0,
  generated     integer not null default 0,
  published     integer not null default 0,
  failed        integer not null default 0,
  log           jsonb
);

create index if not exists spire_runs_site_started_idx
  on spire_runs (site_id, started_at desc);
