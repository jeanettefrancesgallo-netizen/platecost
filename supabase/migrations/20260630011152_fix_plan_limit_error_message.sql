-- Fix a pre-existing typo: PL/pgSQL's RAISE format placeholder is a bare
-- `%`, not `%s` (that's printf syntax, not plpgsql's) — writing `%s` meant
-- the literal letter "s" printed right after each substituted value,
-- producing messages like "max_recipess (max 5s)". Also translates the raw
-- column name into a human label while fixing it.
create or replace function public.enforce_plan_limit(p_org_id uuid, p_limit_column text, p_current_count bigint)
returns void
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_max integer;
  v_label text;
begin
  execute format(
    'select p.%I from public.plans p join public.organizations o on o.plan = p.key where o.id = $1',
    p_limit_column
  ) into v_max using p_org_id;

  if v_max is not null and p_current_count >= v_max then
    v_label := case p_limit_column
      when 'max_recipes' then 'recipes'
      when 'max_ingredients' then 'ingredients'
      when 'max_locations' then 'locations'
      when 'max_members' then 'team members'
      else p_limit_column
    end;
    raise exception 'Plan limit reached for % (max %). Upgrade your plan to add more.', v_label, v_max;
  end if;
end;
$$;
