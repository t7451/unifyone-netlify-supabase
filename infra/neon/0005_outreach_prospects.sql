-- Batch 04 addendum schema extensions.
-- Three additive changes, all idempotent:
--
--   1. spire_outreach_prospects — outreach pipeline (seeded here in Batch 04
--      so the Semrush CSV importer has a landing table; Batch 06 extends it
--      with contact flow, campaign state, etc.)
--   2. spire_submission_citations — per-citation child rows for BrightLocal
--      and any other aggregator that propagates one submission to N directories
--   3. spire_directories.tier — integer tier for CLI filtering (tier 1 =
--      claim-yourself this week, tier 2 = aggregator-bundled, tier 3 = tech
--      directories after content thickens, etc)

create table if not exists spire_outreach_prospects (
  id                         uuid primary key default gen_random_uuid(),
  site_id                    uuid not null references spire_sites(id) on delete cascade,
  source                     text not null
                             check (source in ('competitor_gap', 'haro', 'broken_link', 'manual')),
  source_ref                 text,
  domain                     text not null,
  backlink_url               text,
  anchor_text                text,
  competitor_url             text,
  prospect_contact_email     text,
  prospect_contact_name      text,
  prospect_type              text
                             check (prospect_type is null or prospect_type in
                               ('directory', 'roundup', 'editorial', 'blog', 'resource_page', 'unknown')),
  estimated_dr               integer check (estimated_dr is null or estimated_dr between 0 and 100),
  reachability_score         integer check (reachability_score is null or reachability_score between 0 and 100),
  notes                      text,
  status                     text not null default 'new'
                             check (status in ('new', 'qualified', 'contacted', 'replied', 'won', 'lost', 'blacklisted')),
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  unique (site_id, domain, backlink_url)
);

create index if not exists spire_outreach_prospects_queue_idx
  on spire_outreach_prospects (site_id, status, reachability_score desc);

drop trigger if exists _spire_outreach_prospects_touch on spire_outreach_prospects;
create trigger _spire_outreach_prospects_touch
  before update on spire_outreach_prospects
  for each row execute function _spire_touch_updated_at();

-- Per-citation child rows. BrightLocal (and similar aggregators) fires a
-- webhook per directory it propagates to; the parent spire_submissions row
-- stays as "sent" once the aggregator accepts the order, and each live
-- citation lands here as it comes online.
create table if not exists spire_submission_citations (
  id                 uuid primary key default gen_random_uuid(),
  submission_id      uuid not null references spire_submissions(id) on delete cascade,
  aggregator         text not null,             -- 'brightlocal' | 'moz_local' | 'yext' | ...
  aggregator_ref     text,                       -- order id / citation id from the aggregator
  directory_name     text not null,              -- 'Yelp', 'Foursquare', 'YP.com', ...
  live_url           text,
  status             text not null default 'pending'
                     check (status in ('pending', 'live', 'rejected', 'error')),
  propagated_at      timestamptz,
  raw_payload        jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists spire_submission_citations_parent_idx
  on spire_submission_citations (submission_id, status);

drop trigger if exists _spire_submission_citations_touch on spire_submission_citations;
create trigger _spire_submission_citations_touch
  before update on spire_submission_citations
  for each row execute function _spire_touch_updated_at();

-- spire_directories tier column. Additive; existing rows get tier=3 by default
-- (tech / long-horizon) since most of the Batch 04 seed is that kind. The
-- addendum seed will explicitly set tier 1 for NAP-critical and tier 2 for
-- aggregator-bundled.
alter table spire_directories
  add column if not exists tier integer check (tier is null or tier between 1 and 5);
