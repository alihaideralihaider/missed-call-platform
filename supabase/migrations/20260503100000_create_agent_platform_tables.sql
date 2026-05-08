create table if not exists public.agent_events (
  id text primary key,
  event_type text not null,
  source_system text null,
  source_slug text null,
  business_id text null,
  location_id text null,
  agent_installation_id text null,
  customer jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text null,
  request_id text not null,
  status text not null default 'accepted',
  created_at timestamptz not null default now()
);

create index if not exists agent_events_source_idx
  on public.agent_events (source_system, source_slug);

create index if not exists agent_events_type_created_at_idx
  on public.agent_events (event_type, created_at desc);

create index if not exists agent_events_idempotency_key_idx
  on public.agent_events (idempotency_key)
  where idempotency_key is not null;

create table if not exists public.agent_runs (
  id text primary key,
  event_id text not null references public.agent_events(id),
  event_type text not null,
  source_system text null,
  source_slug text null,
  business_id text null,
  location_id text null,
  agent_installation_id text null,
  status text not null default 'accepted',
  request_id text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists agent_runs_event_id_idx
  on public.agent_runs (event_id);

create index if not exists agent_runs_status_created_at_idx
  on public.agent_runs (status, created_at desc);

create index if not exists agent_runs_source_idx
  on public.agent_runs (source_system, source_slug);

create table if not exists public.agent_actions (
  id text primary key,
  agent_run_id text not null references public.agent_runs(id),
  action_type text not null,
  status text not null default 'created',
  request_id text not null,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index if not exists agent_actions_agent_run_id_idx
  on public.agent_actions (agent_run_id);

create index if not exists agent_actions_type_status_idx
  on public.agent_actions (action_type, status);

create index if not exists agent_actions_created_at_idx
  on public.agent_actions (created_at desc);
