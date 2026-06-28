-- protect_last_owner (20260628001542) fires on every organization_members
-- delete, including the cascade delete that happens when the whole
-- organization row is deleted — which made it impossible to ever delete an
-- organization (the cascading removal of its owner membership looked
-- indistinguishable from "demoting the last owner"). Skip the check once the
-- parent organization itself is gone; there's nothing left to protect.
create or replace function public.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := coalesce(old.organization_id, new.organization_id);
  v_remaining_owners integer;
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    if not exists (select 1 from public.organizations where id = v_org_id) then
      -- Organization itself is being deleted (cascade) — nothing to protect.
      if tg_op = 'DELETE' then
        return old;
      end if;
      return new;
    end if;

    select count(*) into v_remaining_owners
    from public.organization_members
    where organization_id = v_org_id and role = 'owner' and id <> old.id;

    if v_remaining_owners = 0 then
      raise exception 'An organization must have at least one owner.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
