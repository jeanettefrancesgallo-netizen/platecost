-- Setting par/reorder levels is data management (Owner or Manager), distinct
-- from recording stock movements (received/used/wasted/adjustment), which
-- any member can already do per the existing inventory_log_insert_member
-- policy. There's no direct RLS write policy on inventory_stock at all
-- (rows are otherwise only written by the apply_inventory_log trigger), so
-- this needs its own SECURITY DEFINER entry point.
create function public.set_inventory_levels(
  p_location_id uuid,
  p_ingredient_id uuid,
  p_par_level numeric,
  p_reorder_level numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from public.locations where id = p_location_id;
  if v_org_id is null then
    raise exception 'Location not found.';
  end if;

  if not public.is_org_manager_or_owner(v_org_id) then
    raise exception 'Only an owner or manager can set par/reorder levels.';
  end if;

  insert into public.inventory_stock (organization_id, location_id, ingredient_id, par_level, reorder_level)
  values (v_org_id, p_location_id, p_ingredient_id, p_par_level, p_reorder_level)
  on conflict (location_id, ingredient_id)
  do update set
    par_level = excluded.par_level,
    reorder_level = excluded.reorder_level,
    updated_at = now();
end;
$$;
