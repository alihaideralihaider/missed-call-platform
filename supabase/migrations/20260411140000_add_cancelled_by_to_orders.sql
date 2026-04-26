alter table food_ordering.orders
  add column if not exists cancelled_by text;

alter table food_ordering.orders
  drop constraint if exists orders_cancelled_by_check;

alter table food_ordering.orders
  add constraint orders_cancelled_by_check
  check (cancelled_by is null or cancelled_by in ('customer', 'restaurant'));
