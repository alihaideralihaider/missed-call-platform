create table if not exists public.identity_signals (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references food_ordering.restaurants(id) on delete cascade,
  signal_type text not null,
  signal_value text not null,
  signal_value_normalized text not null,
  signal_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_identity_signals_restaurant_type_value
  on public.identity_signals (restaurant_id, signal_type, signal_value_normalized);

create index if not exists idx_identity_signals_type_value
  on public.identity_signals (signal_type, signal_value_normalized);

create index if not exists idx_identity_signals_restaurant_id
  on public.identity_signals (restaurant_id);
