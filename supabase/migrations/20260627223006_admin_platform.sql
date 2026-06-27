-- Platform-operator tables. RLS denies all access to anon/authenticated —
-- these are only ever read or written through Supabase Edge Functions using
-- the service role (which bypasses RLS entirely), gated by is_super_admin()
-- inside the function. No policy is created for authenticated on purpose.
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles (id),
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all', 'free', 'pro', 'enterprise')),
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text,
  is_enabled_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.feature_flag_overrides (
  id uuid primary key default gen_random_uuid(),
  feature_flag_id uuid not null references public.feature_flags (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  is_enabled boolean not null,
  unique (feature_flag_id, organization_id)
);

alter table public.admin_audit_log enable row level security;
alter table public.announcements enable row level security;
alter table public.feature_flags enable row level security;
alter table public.feature_flag_overrides enable row level security;

-- Active announcements are the one piece of admin-owned data tenants need to
-- read directly (to render banners), so allow that single narrow read.
create policy "announcements_select_active" on public.announcements
  for select to authenticated
  using (is_active and now() >= starts_at and (ends_at is null or now() <= ends_at));

-- Tenants need to know whether a flag is enabled for their own org, computed
-- from the default plus their override, but never the raw admin tables.
create function public.is_feature_enabled(p_key text, p_org_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id) then
    return false;
  end if;

  return coalesce(
    (select o.is_enabled
     from public.feature_flag_overrides o
     join public.feature_flags f on f.id = o.feature_flag_id
     where f.key = p_key and o.organization_id = p_org_id),
    (select is_enabled_default from public.feature_flags where key = p_key),
    false
  );
end;
$$;
