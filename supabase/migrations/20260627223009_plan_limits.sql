-- Enforce Free/Pro/Enterprise limits (locations, ingredients, members) at the
-- database layer so they hold even if a UI check is missed or bypassed.
create function public.enforce_plan_limit(p_org_id uuid, p_limit_column text, p_current_count bigint)
returns void
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_max integer;
begin
  execute format(
    'select p.%I from public.plans p join public.organizations o on o.plan = p.key where o.id = $1',
    p_limit_column
  ) into v_max using p_org_id;

  if v_max is not null and p_current_count >= v_max then
    raise exception 'Plan limit reached for %s (max %s). Upgrade your plan to add more.', p_limit_column, v_max;
  end if;
end;
$$;

create function public.check_location_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_plan_limit(
    new.organization_id,
    'max_locations',
    (select count(*) from public.locations where organization_id = new.organization_id)
  );
  return new;
end;
$$;

create trigger on_location_insert_check_limit
  before insert on public.locations
  for each row execute function public.check_location_limit();

create function public.check_ingredient_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_plan_limit(
    new.organization_id,
    'max_ingredients',
    (select count(*) from public.ingredients where organization_id = new.organization_id)
  );
  return new;
end;
$$;

create trigger on_ingredient_insert_check_limit
  before insert on public.ingredients
  for each row execute function public.check_ingredient_limit();

create function public.check_member_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_plan_limit(
    new.organization_id,
    'max_members',
    (select count(*) from public.organization_members where organization_id = new.organization_id)
  );
  return new;
end;
$$;

create trigger on_member_insert_check_limit
  before insert on public.organization_members
  for each row execute function public.check_member_limit();
