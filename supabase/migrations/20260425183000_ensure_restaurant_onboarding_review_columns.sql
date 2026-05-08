alter table food_ordering.restaurants
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists onboarding_status text default 'pending',
  add column if not exists onboarding_source_ip text,
  add column if not exists onboarding_user_agent text,
  add column if not exists is_active boolean;

alter table food_ordering.restaurants
  alter column onboarding_status set default 'pending';

create index if not exists idx_restaurants_onboarding_status
  on food_ordering.restaurants (onboarding_status);

create index if not exists idx_restaurants_onboarding_source_ip
  on food_ordering.restaurants (onboarding_source_ip);
