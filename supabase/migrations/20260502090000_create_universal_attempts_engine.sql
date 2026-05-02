-- Universal Attempts Engine
-- Generic attempt tracking for recovery/growth agents.

create extension if not exists pgcrypto;

create table if not exists attempt_jobs (
  id uuid primary key default gen_random_uuid(),

  agent_type text not null,
  account_type text not null default 'generic',
  account_id text not null,

  trigger_event_type text not null,
  trigger_event_id text,
  subject_type text,
  subject_id text,

  contact_channel text,
  contact_value text,

  status text not null default 'active',
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,

  started_at timestamptz not null default now(),
  expires_at timestamptz,
  completed_at timestamptz,

  outcome_event_type text,
  outcome_event_id text,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attempt_jobs_status_check check (
    status in ('active', 'succeeded', 'expired', 'cancelled', 'failed')
  ),
  constraint attempt_jobs_attempt_count_check check (attempt_count >= 0),
  constraint attempt_jobs_max_attempts_check check (max_attempts > 0)
);

create unique index if not exists attempt_jobs_source_event_unique_idx
  on attempt_jobs (agent_type, trigger_event_type, trigger_event_id);

create index if not exists attempt_jobs_account_status_idx
  on attempt_jobs (account_type, account_id, status, created_at desc);

create index if not exists attempt_jobs_contact_status_idx
  on attempt_jobs (contact_channel, contact_value, status, created_at desc);

create index if not exists attempt_jobs_expires_at_idx
  on attempt_jobs (expires_at)
  where status = 'active';

create table if not exists attempt_messages (
  id uuid primary key default gen_random_uuid(),
  attempt_job_id uuid not null references attempt_jobs(id) on delete cascade,

  channel text not null,
  provider text,
  provider_message_id text,
  message_type text,
  status text not null default 'queued',

  to_value text,
  from_value text,
  body text,

  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  error_code text,
  error_message text,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint attempt_messages_status_check check (
    status in ('queued', 'sent', 'delivered', 'failed', 'suppressed')
  )
);

create index if not exists attempt_messages_job_idx
  on attempt_messages (attempt_job_id, created_at desc);

create index if not exists attempt_messages_provider_message_idx
  on attempt_messages (provider, provider_message_id)
  where provider_message_id is not null;

create table if not exists attempt_events (
  id uuid primary key default gen_random_uuid(),
  attempt_job_id uuid references attempt_jobs(id) on delete cascade,

  event_type text not null,
  source text,
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists attempt_events_job_idx
  on attempt_events (attempt_job_id, created_at desc);

create index if not exists attempt_events_event_type_idx
  on attempt_events (event_type, created_at desc);
