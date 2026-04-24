-- Spire Distribution tables (Batch 04).
-- Directories, submissions, mesh topics + coverage, tracked keywords, rank
-- history. Applied after 0003. Idempotent.

-- Directories we submit to (API, form, or email).
create table if not exists spire_directories (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  name           text not null,
  url            text not null,
  submit_url     text,
  method         text not null check (method in ('api', 'form', 'email', 'manual')),
  method_config  jsonb not null,
  authority      integer check (authority between 0 and 100),
  category       text[] not null default '{}',
  active         boolean not null default true,
  cooldown_days  integer not null default 90 check (cooldown_days between 0 and 3650),
  created_at     timestamptz not null default now()
);

-- Submissions queue + history.
create table if not exists spire_submissions (
  id            uuid primary key default gen_random_uuid(),
  site_id       uuid not null references spire_sites(id) on delete cascade,
  directory_id  uuid not null references spire_directories(id) on delete restrict,
  payload       jsonb not null,
  status        text not null default 'queued'
                check (status in ('queued', 'in_progress', 'sent', 'failed', 'rejected')),
  attempts      integer not null default 0,
  live_url      text,
  response      jsonb,
  error         text,
  queued_at     timestamptz not null default now(),
  sent_at       timestamptz,
  updated_at    timestamptz not null default now(),
  unique (site_id, directory_id)
);

create index if not exists spire_submissions_queue_idx
  on spire_submissions (status, queued_at);

-- Reuse the touch trigger from 0003. It's a generic `new.updated_at = now()`
-- function so we can attach it to any table.
drop trigger if exists _spire_submissions_touch on spire_submissions;
create trigger _spire_submissions_touch
  before update on spire_submissions
  for each row execute function _spire_touch_updated_at();

-- Mesh topic clusters — shared across sites. One cluster per broad topic
-- area (gig-economy, ai-infrastructure, etc). Sites declare coverage.
create table if not exists spire_mesh_topics (
  id            uuid primary key default gen_random_uuid(),
  cluster       text unique not null,
  display_name  text not null,
  description   text
);

create table if not exists spire_mesh_coverage (
  id                uuid primary key default gen_random_uuid(),
  site_id           uuid not null references spire_sites(id) on delete cascade,
  topic_id          uuid not null references spire_mesh_topics(id) on delete cascade,
  primary_path      text not null,
  authority_weight  integer not null default 50 check (authority_weight between 0 and 100),
  created_at        timestamptz not null default now(),
  unique (site_id, topic_id, primary_path)
);

create index if not exists spire_mesh_coverage_topic_weight_idx
  on spire_mesh_coverage (topic_id, authority_weight desc);

-- Keywords we're tracking rank for.
create table if not exists spire_tracked_keywords (
  id              uuid primary key default gen_random_uuid(),
  site_id         uuid not null references spire_sites(id) on delete cascade,
  keyword_id      uuid not null references spire_keywords(id) on delete cascade,
  target_url      text not null,
  location_code   integer not null default 2840,
  language_code   text not null default 'en',
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (site_id, keyword_id, location_code)
);

create index if not exists spire_tracked_keywords_active_idx
  on spire_tracked_keywords (active, site_id);

-- Rank check history — append-only.
create table if not exists spire_rank_checks (
  id                  bigserial primary key,
  tracked_keyword_id  uuid not null references spire_tracked_keywords(id) on delete cascade,
  rank                integer check (rank is null or rank between 1 and 100),
  url_found           text,
  serp_features       jsonb,
  checked_at          timestamptz not null default now()
);

create index if not exists spire_rank_checks_keyword_time_idx
  on spire_rank_checks (tracked_keyword_id, checked_at desc);
