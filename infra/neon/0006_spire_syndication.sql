-- Batch 05: Spire Syndication Layer
-- Three independent subsystems land in one migration:
--   1. spire_gsc_daily + spire_gsc_weekly_rollup (Search Console ingestion)
--   2. spire_syndication_platforms + spire_syndications (republishing)
--   3. spire_pr_opportunities (HARO/PR inbound)

-- =====================================================
-- 1. Search Console daily ingestion
-- =====================================================

create table if not exists spire_gsc_daily (
  id           bigserial primary key,
  site_id      uuid not null references spire_sites(id) on delete cascade,
  query        text not null,
  page         text not null,
  country      text,
  device       text,
  date         date not null,
  clicks       integer not null default 0,
  impressions  integer not null default 0,
  ctr          numeric(6, 4) not null default 0,
  position     numeric(6, 2),
  pulled_at    timestamptz not null default now(),
  unique (site_id, query, page, country, device, date)
);

create index if not exists spire_gsc_daily_site_date_idx
  on spire_gsc_daily (site_id, date desc);
create index if not exists spire_gsc_daily_query_date_idx
  on spire_gsc_daily (site_id, query, date desc);
create index if not exists spire_gsc_daily_page_date_idx
  on spire_gsc_daily (site_id, page, date desc);

-- Materialized rollup for digest performance. Refresh nightly via the
-- gsc-ingest-daily function (REFRESH MATERIALIZED VIEW CONCURRENTLY needs
-- the unique index below to support concurrent refresh).
create materialized view if not exists spire_gsc_weekly_rollup as
select
  site_id,
  query,
  page,
  date_trunc('week', date) as week_start,
  sum(clicks)::integer as clicks,
  sum(impressions)::integer as impressions,
  avg(position)::numeric(6, 2) as avg_position
from spire_gsc_daily
group by site_id, query, page, week_start;

create unique index if not exists spire_gsc_weekly_rollup_pk
  on spire_gsc_weekly_rollup (site_id, query, page, week_start);
create index if not exists spire_gsc_weekly_rollup_site_week_idx
  on spire_gsc_weekly_rollup (site_id, week_start desc);

-- =====================================================
-- 2. Syndication
-- =====================================================

create table if not exists spire_syndication_platforms (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text unique not null,
  name                 text not null,
  method               text not null check (method in ('api', 'browser')),
  config               jsonb not null,
  active               boolean not null default true,
  audience_match       text[] not null default '{}',
  min_quality_score    integer not null default 90 check (min_quality_score between 0 and 100),
  delay_days           integer not null default 7 check (delay_days between 0 and 365),
  rate_limit_per_day   integer not null default 2 check (rate_limit_per_day between 0 and 50),
  created_at           timestamptz not null default now()
);

create table if not exists spire_syndications (
  id                 uuid primary key default gen_random_uuid(),
  content_plan_id    uuid not null references spire_content_plan(id) on delete cascade,
  platform_id        uuid not null references spire_syndication_platforms(id) on delete restrict,
  status             text not null default 'queued'
                     check (status in ('queued', 'rendering', 'publishing', 'published', 'failed', 'skipped')),
  external_url       text,
  external_id        text,
  rendered_payload   jsonb,
  response           jsonb,
  error              text,
  attempts           integer not null default 0,
  queued_at          timestamptz not null default now(),
  published_at      timestamptz,
  updated_at         timestamptz not null default now(),
  unique (content_plan_id, platform_id)
);

create index if not exists spire_syndications_queue_idx
  on spire_syndications (status, queued_at);
create index if not exists spire_syndications_plan_idx
  on spire_syndications (content_plan_id);

drop trigger if exists _spire_syndications_touch on spire_syndications;
create trigger _spire_syndications_touch
  before update on spire_syndications
  for each row execute function _spire_touch_updated_at();

-- =====================================================
-- 3. HARO / PR opportunities
-- =====================================================

create table if not exists spire_pr_opportunities (
  id                  uuid primary key default gen_random_uuid(),
  source              text not null
                      check (source in ('haro', 'sourcebottle', 'qwoted', 'manual')),
  source_message_id   text,
  outlet              text,
  reporter_name       text,
  reporter_email      text,
  query_subject       text not null,
  query_body          text not null,
  deadline            timestamptz,
  matched_clusters    text[] not null default '{}',
  match_score         integer check (match_score is null or match_score between 0 and 100),
  match_rationale     text,
  drafted_responses   jsonb,
  status              text not null default 'new'
                      check (status in ('new', 'qualified', 'ignored', 'drafted', 'sent', 'won', 'lost', 'expired')),
  decided_by          text,
  decided_at          timestamptz,
  sent_response_id    uuid,
  outcome_url         text,
  outcome_dr          integer check (outcome_dr is null or outcome_dr between 0 and 100),
  received_at         timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (source, source_message_id)
);

create index if not exists spire_pr_opportunities_status_deadline_idx
  on spire_pr_opportunities (status, deadline);
create index if not exists spire_pr_opportunities_status_score_idx
  on spire_pr_opportunities (status, match_score desc);

drop trigger if exists _spire_pr_opportunities_touch on spire_pr_opportunities;
create trigger _spire_pr_opportunities_touch
  before update on spire_pr_opportunities
  for each row execute function _spire_touch_updated_at();
