alter table food_ordering.restaurant_billing
add column if not exists addons jsonb not null default '[]'::jsonb;
