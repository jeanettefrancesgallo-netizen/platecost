-- ---------------------------------------------------------------------------
-- Super-admin platform console.
--
-- Architecture note: the brief calls for admin actions to bypass tenant RLS
-- "only through secure server-side functions (service-role / Edge
-- Functions)". This project has no Docker available to build/test Edge
-- Functions locally, so the server-side boundary here is implemented with
-- Postgres SECURITY DEFINER functions instead (the same pattern already used
-- for create_organization_with_owner) — they run with elevated privileges,
-- gate on is_super_admin(), and are exercised entirely server-side. The
-- service-role key itself is still never used by the browser.
--
-- Read-only visibility (dashboards, drill-down) is granted via additional
-- RLS SELECT policies gated on is_super_admin() — simple, narrow, and
-- auditable by inspection. Every *mutating* admin action instead goes
-- through a RPC function that performs the change and writes an
-- admin_audit_log row in the same transaction, so the audit trail can never
-- be bypassed by a stray client-side UPDATE.
-- ---------------------------------------------------------------------------

-- Cross-tenant read visibility for the platform dashboard / tenant drill-down.
create policy "profiles_select_super_admin" on public.profiles
  for select to authenticated
  using (public.is_super_admin());

create policy "organizations_select_super_admin" on public.organizations
  for select to authenticated
  using (public.is_super_admin());

create policy "members_select_super_admin" on public.organization_members
  for select to authenticated
  using (public.is_super_admin());

create policy "subscriptions_select_super_admin" on public.subscriptions
  for select to authenticated
  using (public.is_super_admin());

create policy "ingredients_select_super_admin" on public.ingredients
  for select to authenticated
  using (public.is_super_admin());

create policy "recipes_select_super_admin" on public.recipes
  for select to authenticated
  using (public.is_super_admin());

-- Audit log: super admins can read it; rows are only ever written by the
-- SECURITY DEFINER functions below (no insert/update/delete policy here),
-- so the trail can't be edited even by an admin's own client.
create policy "admin_audit_log_select_super_admin" on public.admin_audit_log
  for select to authenticated
  using (public.is_super_admin());

-- Announcements and feature flags: full CRUD for super admins. (Tenants
-- already have their own narrow "see active announcements" policy from the
-- 20260627223006 migration.)
create policy "announcements_all_super_admin" on public.announcements
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "feature_flags_all_super_admin" on public.feature_flags
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "feature_flag_overrides_all_super_admin" on public.feature_flag_overrides
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Mutating actions, each: assert is_super_admin(), perform the change, log it.
-- ---------------------------------------------------------------------------
create function public.admin_set_organization_status(p_org_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only a platform admin can do this.';
  end if;
  if p_status not in ('trialing', 'active', 'past_due', 'suspended', 'canceled') then
    raise exception 'Invalid status: %', p_status;
  end if;

  update public.organizations set status = p_status, updated_at = now() where id = p_org_id;

  insert into public.admin_audit_log (admin_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'set_organization_status', 'organization', p_org_id::text, jsonb_build_object('status', p_status));
end;
$$;

create function public.admin_change_organization_plan(p_org_id uuid, p_plan text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only a platform admin can do this.';
  end if;

  update public.organizations set plan = p_plan, updated_at = now() where id = p_org_id;
  update public.subscriptions set plan = p_plan, updated_at = now() where organization_id = p_org_id;

  insert into public.admin_audit_log (admin_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'change_organization_plan', 'organization', p_org_id::text, jsonb_build_object('plan', p_plan));
end;
$$;

create function public.admin_extend_trial(p_org_id uuid, p_days integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_trial_ends_at timestamptz;
begin
  if not public.is_super_admin() then
    raise exception 'Only a platform admin can do this.';
  end if;

  update public.organizations
  set trial_ends_at = coalesce(trial_ends_at, now()) + (p_days || ' days')::interval,
      updated_at = now()
  where id = p_org_id
  returning trial_ends_at into v_new_trial_ends_at;

  insert into public.admin_audit_log (admin_user_id, action, target_type, target_id, metadata)
  values (
    auth.uid(), 'extend_trial', 'organization', p_org_id::text,
    jsonb_build_object('days', p_days, 'new_trial_ends_at', v_new_trial_ends_at)
  );
end;
$$;

create function public.admin_delete_organization(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if not public.is_super_admin() then
    raise exception 'Only a platform admin can do this.';
  end if;

  select name into v_name from public.organizations where id = p_org_id;
  if v_name is null then
    raise exception 'Organization not found.';
  end if;

  insert into public.admin_audit_log (admin_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'delete_organization', 'organization', p_org_id::text, jsonb_build_object('name', v_name));

  delete from public.organizations where id = p_org_id;
end;
$$;

create function public.admin_log_organization_view(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only a platform admin can do this.';
  end if;

  insert into public.admin_audit_log (admin_user_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'view_organization', 'organization', p_org_id::text, '{}'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Platform dashboard stats — one round trip for the whole dashboard.
-- ---------------------------------------------------------------------------
create function public.admin_get_platform_stats()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'Only a platform admin can do this.';
  end if;

  select jsonb_build_object(
    'total_organizations', (select count(*) from public.organizations),
    'active_organizations', (select count(*) from public.organizations where status = 'active'),
    'trialing_organizations', (select count(*) from public.organizations where status = 'trialing'),
    'suspended_organizations', (select count(*) from public.organizations where status = 'suspended'),
    'churned_organizations', (select count(*) from public.organizations where status = 'canceled'),
    'total_users', (select count(*) from public.profiles),
    'mrr_usd', (
      select coalesce(sum(
        case
          when s.billing_cycle = 'yearly' then p.price_yearly_usd / 12.0
          else p.price_monthly_usd
        end
      ), 0)
      from public.organizations o
      join public.plans p on p.key = o.plan
      left join public.subscriptions s on s.organization_id = o.id
      where o.status = 'active'
    ),
    'plan_distribution', (
      select coalesce(jsonb_agg(jsonb_build_object('plan', plan, 'count', count)), '[]'::jsonb)
      from (
        select plan, count(*) as count from public.organizations group by plan
      ) t
    ),
    'signups_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', day, 'count', count) order by day), '[]'::jsonb)
      from (
        select date_trunc('day', created_at)::date as day, count(*) as count
        from public.organizations
        where created_at >= now() - interval '30 days'
        group by 1
      ) t
    )
  ) into v_result;

  return v_result;
end;
$$;
