-- Manual billing (no Stripe): tenants pay via GCash/bank transfer outside the
-- app, submit a reference number, and a platform admin approves it, which
-- activates the subscription. Mirrors the brief's "Owner: full + billing"
-- model — only the owner can request a plan change/submit payment.

-- PHP list prices alongside the existing USD ones, since PHP is this
-- platform's default currency and manual payments are typically PHP
-- (GCash/PH bank transfer). Tenants on a non-PHP/USD base currency see USD
-- as a reasonable fallback in the UI.
alter table public.plans
  add column price_monthly_php numeric(10, 2) not null default 0,
  add column price_yearly_php numeric(10, 2) not null default 0;

update public.plans set price_monthly_php = 0, price_yearly_php = 0 where key = 'free';
update public.plans set price_monthly_php = 1500, price_yearly_php = 15000 where key = 'pro';
update public.plans set price_monthly_php = 5000, price_yearly_php = 50000 where key = 'enterprise';

-- ---------------------------------------------------------------------------
-- platform_payment_methods: GCash / bank transfer details the platform
-- operator configures (in /admin) and tenants see when requesting an
-- upgrade. Not tenant-scoped — this is the platform's own payment info.
-- ---------------------------------------------------------------------------
create table public.platform_payment_methods (
  id uuid primary key default gen_random_uuid(),
  method text not null check (method in ('gcash', 'bank_transfer', 'other')),
  label text not null,
  details jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.platform_payment_methods enable row level security;

create policy "payment_methods_select_active" on public.platform_payment_methods
  for select to authenticated
  using (is_active or public.is_super_admin());

create policy "payment_methods_all_super_admin" on public.platform_payment_methods
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- payment_submissions: an owner's request "we paid for plan X, here's our
-- reference number", awaiting admin review.
-- ---------------------------------------------------------------------------
create table public.payment_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  plan text not null references public.plans (key),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  amount numeric(12, 2) not null,
  currency text not null,
  payment_method text not null check (payment_method in ('gcash', 'bank_transfer', 'other')),
  reference_number text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid not null references public.profiles (id),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now()
);

create index payment_submissions_organization_id_idx on public.payment_submissions (organization_id);

alter table public.payment_submissions enable row level security;

create policy "payment_submissions_select_member_or_admin" on public.payment_submissions
  for select to authenticated
  using (public.is_org_member(organization_id) or public.is_super_admin());

-- Billing is "Owner: full + billing" — only the owner can submit a payment
-- request for their org.
create policy "payment_submissions_insert_owner" on public.payment_submissions
  for insert to authenticated
  with check (public.is_org_owner(organization_id) and submitted_by = auth.uid());

-- No update/delete policy for authenticated: review decisions only happen
-- through the SECURITY DEFINER functions below, so the audit trail (status,
-- reviewed_by/at) can't be edited by either the tenant or a stray admin
-- client-side call.

create function public.admin_approve_payment(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.payment_submissions;
  v_period_end timestamptz;
begin
  if not public.is_super_admin() then
    raise exception 'Only a platform admin can do this.';
  end if;

  select * into v_submission from public.payment_submissions where id = p_submission_id;
  if v_submission is null then
    raise exception 'Submission not found.';
  end if;
  if v_submission.status <> 'pending' then
    raise exception 'Submission already reviewed.';
  end if;

  v_period_end := now() + case
    when v_submission.billing_cycle = 'yearly' then interval '1 year'
    else interval '1 month'
  end;

  update public.payment_submissions
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_submission_id;

  insert into public.subscriptions (organization_id, plan, billing_cycle, status, current_period_start, current_period_end)
  values (v_submission.organization_id, v_submission.plan, v_submission.billing_cycle, 'active', now(), v_period_end)
  on conflict (organization_id) do update set
    plan = excluded.plan,
    billing_cycle = excluded.billing_cycle,
    status = 'active',
    current_period_start = now(),
    current_period_end = v_period_end,
    updated_at = now();

  insert into public.admin_audit_log (admin_user_id, action, target_type, target_id, metadata)
  values (
    auth.uid(), 'approve_payment', 'payment_submission', p_submission_id::text,
    jsonb_build_object('organization_id', v_submission.organization_id, 'plan', v_submission.plan)
  );
end;
$$;

create function public.admin_reject_payment(p_submission_id uuid, p_notes text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.payment_submissions;
begin
  if not public.is_super_admin() then
    raise exception 'Only a platform admin can do this.';
  end if;

  select * into v_submission from public.payment_submissions where id = p_submission_id;
  if v_submission is null then
    raise exception 'Submission not found.';
  end if;
  if v_submission.status <> 'pending' then
    raise exception 'Submission already reviewed.';
  end if;

  update public.payment_submissions
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), admin_notes = p_notes
  where id = p_submission_id;

  insert into public.admin_audit_log (admin_user_id, action, target_type, target_id, metadata)
  values (
    auth.uid(), 'reject_payment', 'payment_submission', p_submission_id::text,
    jsonb_build_object('organization_id', v_submission.organization_id, 'notes', p_notes)
  );
end;
$$;
