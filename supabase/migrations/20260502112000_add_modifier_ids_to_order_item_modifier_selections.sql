alter table if exists food_ordering.order_item_modifier_selections
  add column if not exists modifier_group_id uuid null;

alter table if exists food_ordering.order_item_modifier_selections
  add column if not exists modifier_option_id uuid null;

create index if not exists order_item_modifier_selections_group_id_idx
  on food_ordering.order_item_modifier_selections (modifier_group_id)
  where modifier_group_id is not null;

create index if not exists order_item_modifier_selections_option_id_idx
  on food_ordering.order_item_modifier_selections (modifier_option_id)
  where modifier_option_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_item_modifier_selections_modifier_group_id_fkey'
  ) then
    alter table food_ordering.order_item_modifier_selections
      add constraint order_item_modifier_selections_modifier_group_id_fkey
      foreign key (modifier_group_id)
      references food_ordering.modifier_groups(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_item_modifier_selections_modifier_option_id_fkey'
  ) then
    alter table food_ordering.order_item_modifier_selections
      add constraint order_item_modifier_selections_modifier_option_id_fkey
      foreign key (modifier_option_id)
      references food_ordering.modifier_group_options(id);
  end if;
end $$;

notify pgrst, 'reload schema';
