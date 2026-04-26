create extension if not exists pgcrypto;

create table if not exists food_ordering.restaurant_usage_periods (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references food_ordering.restaurants(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  orders_count integer not null default 0,
  sms_sent_count integer not null default 0,
  calls_count integer not null default 0,
  estimated_sms_cost numeric(10, 4) not null default 0,
  estimated_call_cost numeric(10, 4) not null default 0,
  estimated_total_cost numeric(10, 4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, period_start, period_end)
);

create index if not exists restaurant_usage_periods_restaurant_id_idx
  on food_ordering.restaurant_usage_periods (restaurant_id);

create index if not exists restaurant_usage_periods_period_idx
  on food_ordering.restaurant_usage_periods (period_start, period_end);
