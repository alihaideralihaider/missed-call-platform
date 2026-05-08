alter table food_ordering.restaurants
  add column if not exists platform_review_status text not null default 'unreviewed',
  add column if not exists onboarding_reviewed_at timestamptz;

alter table food_ordering.restaurants
  alter column platform_review_status set default 'unreviewed';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurants_platform_review_status_check'
      and conrelid = 'food_ordering.restaurants'::regclass
  ) then
    alter table food_ordering.restaurants
      add constraint restaurants_platform_review_status_check
      check (
        platform_review_status in (
          'unreviewed',
          'needs_review',
          'approved',
          'closed',
          'rejected_fraud'
        )
      );
  end if;
end $$;

create index if not exists idx_restaurants_platform_review_status
  on food_ordering.restaurants (platform_review_status);
