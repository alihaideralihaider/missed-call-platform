alter table food_ordering.restaurants
  add column if not exists onboarding_ip_country text,
  add column if not exists onboarding_ip_region text,
  add column if not exists onboarding_ip_city text,
  add column if not exists onboarding_ip_lat numeric,
  add column if not exists onboarding_ip_lon numeric,
  add column if not exists onboarding_ip_lookup_at timestamptz;

create index if not exists idx_restaurants_onboarding_ip_city_region_country
  on food_ordering.restaurants (
    onboarding_ip_city,
    onboarding_ip_region,
    onboarding_ip_country
  );

create index if not exists idx_restaurants_onboarding_ip_region_country
  on food_ordering.restaurants (
    onboarding_ip_region,
    onboarding_ip_country
  );

create index if not exists idx_restaurants_onboarding_ip_country
  on food_ordering.restaurants (onboarding_ip_country);
