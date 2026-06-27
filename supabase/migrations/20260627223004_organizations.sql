create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  base_currency text not null default 'PHP',
  plan text not null default 'free' references public.plans (key),
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'suspended', 'canceled')),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  address text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.locations enable row level security;

-- ---------------------------------------------------------------------------
-- Helper functions used by every tenant-table RLS policy from here on.
-- security definer + a fixed search_path so they can read organization_members
-- regardless of the calling role's own RLS, without being hijackable.
-- ---------------------------------------------------------------------------
create function public.is_org_member(p_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_org_id and user_id = auth.uid()
  );
$$;

create function public.org_role(p_org_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.organization_members
  where organization_id = p_org_id and user_id = auth.uid();
$$;

create function public.is_org_manager_or_owner(p_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.org_role(p_org_id) in ('owner', 'manager');
$$;

-- ---------------------------------------------------------------------------
-- organizations: members can read; no direct INSERT/UPDATE/DELETE grant for
-- authenticated. Mutations go through the SECURITY DEFINER functions below
-- (or the service role, for plan/billing fields synced from Stripe).
-- ---------------------------------------------------------------------------
create policy "organizations_select_member" on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create function public.create_organization_with_owner(p_name text, p_slug text, p_base_currency text default 'PHP')
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
begin
  insert into public.organizations (name, slug, base_currency)
  values (p_name, p_slug, p_base_currency)
  returning * into v_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org.id, auth.uid(), 'owner');

  return v_org;
end;
$$;

create function public.update_organization(p_org_id uuid, p_name text, p_base_currency text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
begin
  if public.org_role(p_org_id) <> 'owner' then
    raise exception 'Only the organization owner can update organization settings.';
  end if;

  update public.organizations
  set name = coalesce(p_name, name),
      base_currency = coalesce(p_base_currency, base_currency),
      updated_at = now()
  where id = p_org_id
  returning * into v_org;

  return v_org;
end;
$$;

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
create policy "members_select_same_org" on public.organization_members
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "members_insert_owner_manager" on public.organization_members
  for insert to authenticated
  with check (public.is_org_manager_or_owner(organization_id));

create policy "members_update_owner_manager" on public.organization_members
  for update to authenticated
  using (public.is_org_manager_or_owner(organization_id));

create policy "members_delete_owner_manager" on public.organization_members
  for delete to authenticated
  using (public.is_org_manager_or_owner(organization_id));

-- ---------------------------------------------------------------------------
-- locations
-- ---------------------------------------------------------------------------
create policy "locations_select_member" on public.locations
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "locations_write_owner_manager" on public.locations
  for all to authenticated
  using (public.is_org_manager_or_owner(organization_id))
  with check (public.is_org_manager_or_owner(organization_id));
