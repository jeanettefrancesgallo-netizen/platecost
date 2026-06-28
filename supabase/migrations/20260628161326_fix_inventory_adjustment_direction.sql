-- The original apply_inventory_log() treated every change_type other than
-- 'received' as a decrease (-abs(quantity)), including 'adjustment'. That
-- makes 'adjustment' indistinguishable from 'used'/'wasted' and means
-- there's no way to correct stock *upward* after a physical count comes in
-- higher than the system thinks. 'adjustment' should be a signed delta:
-- positive increases stock, negative decreases it.
create or replace function public.apply_inventory_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta numeric(12, 4);
begin
  v_delta := case
    when new.change_type = 'received' then new.quantity
    when new.change_type = 'adjustment' then new.quantity
    else -abs(new.quantity)
  end;

  insert into public.inventory_stock (organization_id, location_id, ingredient_id, quantity_on_hand)
  values (new.organization_id, new.location_id, new.ingredient_id, v_delta)
  on conflict (location_id, ingredient_id)
  do update set
    quantity_on_hand = public.inventory_stock.quantity_on_hand + v_delta,
    updated_at = now();

  return new;
end;
$$;
