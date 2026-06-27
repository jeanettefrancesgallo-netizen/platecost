-- ---------------------------------------------------------------------------
-- Tighten organization_members write access to Owner-only. Per the role
-- model in the brief, "Manager" means manage data (ingredients, recipes,
-- inventory) — team membership and roles are part of "Owner: full + billing",
-- not data management. The original policies from 20260627223004 allowed
-- owner-or-manager; replace them.
-- ---------------------------------------------------------------------------
drop policy if exists "members_insert_owner_manager" on public.organization_members;
drop policy if exists "members_update_owner_manager" on public.organization_members;
drop policy if exists "members_delete_owner_manager" on public.organization_members;

create function public.is_org_owner(p_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.org_role(p_org_id) = 'owner';
$$;

create policy "members_insert_owner" on public.organization_members
  for insert to authenticated
  with check (public.is_org_owner(organization_id));

create policy "members_update_owner" on public.organization_members
  for update to authenticated
  using (public.is_org_owner(organization_id));

create policy "members_delete_owner" on public.organization_members
  for delete to authenticated
  using (public.is_org_owner(organization_id));

-- Never allow an update/delete that would leave an organization with zero
-- owners — RLS alone can't express "count of owners after this change", so
-- this needs a trigger.
create function public.protect_last_owner()
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

create trigger on_member_change_protect_last_owner
  before update or delete on public.organization_members
  for each row execute function public.protect_last_owner();

-- ---------------------------------------------------------------------------
-- profiles: a Team page needs to show teammates' names/emails, but the
-- original policy only let a user read their own row. Add a second policy
-- (policies are OR'd together) allowing a profile to be read by anyone who
-- shares at least one organization with it.
-- ---------------------------------------------------------------------------
create policy "profiles_select_fellow_org_members" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.organization_members om
      where om.user_id = profiles.id and public.is_org_member(om.organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- organization_invitations: Owner invites by email; the invitee may not have
-- an account yet, so this can't just insert into organization_members
-- directly. Acceptance happens automatically when a matching email signs up
-- (see trigger below), or could be done explicitly later from an "accept"
-- screen for existing users.
-- ---------------------------------------------------------------------------
create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null check (role in ('manager', 'staff')),
  invited_by uuid not null references public.profiles (id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

alter table public.organization_invitations enable row level security;

create policy "invitations_select_owner" on public.organization_invitations
  for select to authenticated
  using (public.is_org_owner(organization_id));

-- An invitee needs to see their own pending invitations (e.g. to render
-- "You've been invited to X" after signing up) without being an org member.
create policy "invitations_select_invitee" on public.organization_invitations
  for select to authenticated
  using (email = (select email from public.profiles where id = auth.uid()));

create policy "invitations_write_owner" on public.organization_invitations
  for insert to authenticated
  with check (public.is_org_owner(organization_id));

create policy "invitations_delete_owner" on public.organization_invitations
  for delete to authenticated
  using (public.is_org_owner(organization_id));

create function public.accept_pending_invitations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation record;
begin
  for v_invitation in
    select * from public.organization_invitations
    where email = new.email and accepted_at is null
  loop
    insert into public.organization_members (organization_id, user_id, role)
    values (v_invitation.organization_id, new.id, v_invitation.role)
    on conflict (organization_id, user_id) do nothing;

    update public.organization_invitations
    set accepted_at = now()
    where id = v_invitation.id;
  end loop;

  return new;
end;
$$;

create trigger on_profile_created_accept_invitations
  after insert on public.profiles
  for each row execute function public.accept_pending_invitations();
