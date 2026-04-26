create extension if not exists pgcrypto;

create table if not exists food_ordering.restaurant_billing (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references food_ordering.restaurants(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_key text,
  subscription_status text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists restaurant_billing_stripe_customer_id_idx
  on food_ordering.restaurant_billing (stripe_customer_id);

create index if not exists restaurant_billing_stripe_subscription_id_idx
  on food_ordering.restaurant_billing (stripe_subscription_id);

create table if not exists food_ordering.billing_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references food_ordering.restaurants(id) on delete set null,
  stripe_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_restaurant_id_idx
  on food_ordering.billing_events (restaurant_id);

create table if not exists food_ordering.service_purchases (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references food_ordering.restaurants(id) on delete cascade,
  service_key text not null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  amount numeric(10, 2),
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_purchases_restaurant_id_idx
  on food_ordering.service_purchases (restaurant_id);
