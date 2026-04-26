create table if not exists public.platform_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  role text not null default 'platform_admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint platform_users_role_check
    check (role in ('platform_owner', 'platform_admin', 'platform_operator', 'platform_analyst'))
);

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

create table if not exists public.platform_ip_watchlist (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null unique,
  status text not null default 'watch',
  reason text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint platform_ip_watchlist_status_check
    check (status in ('watch', 'blocked'))
);

alter table food_ordering.restaurants
  add column if not exists onboarding_source_ip text;

alter table food_ordering.restaurants
  add column if not exists onboarding_user_agent text;

create index if not exists idx_restaurants_onboarding_status
  on food_ordering.restaurants (onboarding_status);

create index if not exists idx_restaurants_onboarding_source_ip
  on food_ordering.restaurants (onboarding_source_ip);
