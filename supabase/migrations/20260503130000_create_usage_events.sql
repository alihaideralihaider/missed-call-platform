create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  account_id text,
  project_id text,
  environment text not null default 'production',
  metric_key text not null,
  source_type text not null,
  source_id text not null,
  quantity numeric not null default 1,
  billable boolean not null default false,
  idempotency_key text,
  occurred_at timestamptz not null default now(),
  billing_period_start timestamptz,
  billing_period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint usage_events_quantity_positive check (quantity > 0),
  constraint usage_events_environment_check check (
    environment in ('sandbox', 'production')
  ),
  constraint usage_events_metric_key_check check (
    metric_key in (
      'accepted_event',
      'agent_run',
      'action_execution',
      'attempt_execution',
      'webhook_delivery',
      'batch_file_generated',
      'sftp_file_downloaded',
      'outcome_recorded'
    )
  )
);

create index if not exists usage_events_account_period_idx
  on public.usage_events (account_id, billing_period_start, billing_period_end);

create index if not exists usage_events_metric_period_idx
  on public.usage_events (metric_key, billing_period_start, billing_period_end);

create index if not exists usage_events_source_idx
  on public.usage_events (source_type, source_id);

create unique index if not exists usage_events_idempotency_unique_idx
  on public.usage_events (idempotency_key)
  where idempotency_key is not null;
