create table if not exists public.agent_modifier_suggestions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  customer_id uuid null,
  cart_id text null,
  item_id uuid not null,
  modifier_group_id uuid null,
  modifier_option_id uuid null,
  suggestion_type text not null,
  reason text null,
  status text not null default 'shown',
  price_delta numeric(10,2) null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  responded_at timestamptz null
);

create index if not exists agent_modifier_suggestions_restaurant_created_idx
  on public.agent_modifier_suggestions (restaurant_id, created_at desc);

create index if not exists agent_modifier_suggestions_cart_status_idx
  on public.agent_modifier_suggestions (cart_id, status)
  where cart_id is not null;

create index if not exists agent_modifier_suggestions_item_idx
  on public.agent_modifier_suggestions (item_id);
