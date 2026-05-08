create table if not exists public.platform_activity_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  event_type text not null,
  actor_type text not null default 'platform_admin',
  actor_user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.platform_activity_events
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists event_type text,
  add column if not exists actor_type text default 'platform_admin',
  add column if not exists actor_user_id uuid,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now();

alter table public.platform_activity_events
  alter column entity_type set not null,
  alter column event_type set not null,
  alter column actor_type set default 'platform_admin',
  alter column actor_type set not null,
  alter column metadata set default '{}'::jsonb,
  alter column metadata set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'platform_activity_events_pkey'
      and conrelid = 'public.platform_activity_events'::regclass
  ) then
    alter table public.platform_activity_events
      add constraint platform_activity_events_pkey primary key (id);
  end if;
end $$;

create index if not exists idx_platform_activity_events_created_at
  on public.platform_activity_events (created_at desc);
