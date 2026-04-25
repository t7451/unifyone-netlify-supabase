-- Batch 06 — Spire Outreach Engine.
-- Adds the campaign/sequence/message/reply state machine on top of the prospect
-- table seeded in 0005_outreach_prospects.sql. Suppression and broken-link
-- discovery are also defined here. Volume tracking is denormalized so the
-- deliverability gate can do a single-row check.

create table if not exists spire_outreach_campaigns (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references spire_sites(id) on delete cascade,
  campaign_type text not null,
  name text not null,
  active boolean default true,
  daily_send_cap integer not null default 5,
  autopilot boolean default false,
  from_name text not null default 'Keith Skaggs',
  from_email text not null default 'keith@outreach.unifyone.com',
  reply_to_email text not null default 'keith@1commerce.online',
  created_at timestamptz default now(),
  unique (site_id, campaign_type),
  check (campaign_type in ('broken_link', 'guest_post', 'resource_page'))
);

create table if not exists spire_outreach_sequences (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references spire_outreach_campaigns(id) on delete cascade,
  prospect_id uuid references spire_outreach_prospects(id) on delete cascade,
  status text default 'active' not null,
  current_step integer default 0,
  asset_url text,
  asset_title text,
  pitch_angle text,
  context_snapshot jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (campaign_id, prospect_id),
  check (status in ('active', 'replied', 'bounced', 'unsubscribed', 'completed', 'killed'))
);

create index if not exists spire_outreach_sequences_status_idx
  on spire_outreach_sequences (status, updated_at desc);

create table if not exists spire_outreach_messages (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid references spire_outreach_sequences(id) on delete cascade,
  step integer not null,
  status text default 'pending_approval' not null,
  scheduled_for timestamptz not null,
  subject text not null,
  body_text text not null,
  body_html text,
  sent_at timestamptz,
  resend_message_id text,
  approved_by text,
  approved_at timestamptz,
  error text,
  attempts integer default 0,
  created_at timestamptz default now(),
  unique (sequence_id, step),
  check (step >= 0 and step <= 2),
  check (status in ('pending_approval', 'scheduled', 'ready_to_send', 'sent', 'bounced', 'failed', 'suppressed', 'cancelled'))
);

create index if not exists spire_outreach_messages_queue_idx
  on spire_outreach_messages (status, scheduled_for);

create table if not exists spire_outreach_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references spire_outreach_messages(id) on delete set null,
  sequence_id uuid references spire_outreach_sequences(id) on delete cascade,
  prospect_id uuid references spire_outreach_prospects(id) on delete cascade,
  from_email text not null,
  in_reply_to text,
  subject text,
  body_text text,
  classification text,
  classification_confidence numeric(4,3),
  classification_rationale text,
  drafted_followup jsonb,
  acted_on boolean default false,
  acted_at timestamptz,
  received_at timestamptz default now(),
  check (classification is null or classification in ('positive', 'negotiating', 'neutral', 'negative', 'auto_reply', 'unsubscribe', 'bounce', 'other'))
);

create index if not exists spire_outreach_replies_queue_idx
  on spire_outreach_replies (acted_on, received_at desc);

create table if not exists spire_outreach_suppression (
  id uuid primary key default gen_random_uuid(),
  email text,
  domain text,
  reason text not null,
  source_message_id uuid references spire_outreach_messages(id) on delete set null,
  expires_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  check (reason in ('unsubscribe', 'hard_bounce', 'complaint', 'negative_reply', 'manual', 'sender_request')),
  check (email is not null or domain is not null)
);

create unique index if not exists spire_outreach_suppression_email_uniq
  on spire_outreach_suppression (email) where email is not null;
create unique index if not exists spire_outreach_suppression_domain_uniq
  on spire_outreach_suppression (domain) where domain is not null;

create table if not exists spire_broken_links (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references spire_outreach_prospects(id) on delete cascade,
  source_page_url text not null,
  broken_url text not null,
  anchor_text text,
  context_snippet text,
  matched_asset_url text,
  matched_asset_score integer,
  status text default 'discovered' not null,
  discovered_at timestamptz default now(),
  unique (prospect_id, source_page_url, broken_url),
  check (status in ('discovered', 'pitched', 'won', 'dead'))
);

create index if not exists spire_broken_links_match_idx
  on spire_broken_links (status, matched_asset_score desc);

create table if not exists spire_outreach_volume_daily (
  id bigserial primary key,
  campaign_id uuid references spire_outreach_campaigns(id) on delete cascade,
  date date not null,
  sent_count integer default 0,
  unique (campaign_id, date)
);

-- Touch trigger reuse — the trigger function was created in 0003.
drop trigger if exists touch_spire_outreach_sequences on spire_outreach_sequences;
create trigger touch_spire_outreach_sequences
  before update on spire_outreach_sequences
  for each row execute function _spire_touch_updated_at();
