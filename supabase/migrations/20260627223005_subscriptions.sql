-- One subscription record per organization (tenant-level billing). Synced
-- from Stripe by an Edge Function webhook using the service role, which
-- bypasses RLS — there is intentionally no INSERT/UPDATE policy for
-- authenticated users here.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  plan text not null default 'free' references public.plans (key),
  billing_cycle text check (billing_cycle in ('monthly', 'yearly')),
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_member" on public.subscriptions
  for select to authenticated
  using (public.is_org_member(organization_id));

-- Keep organizations.plan/status denormalized for cheap RLS-free reads
-- (e.g. plan gating checks) in sync with the subscription record.
create function public.sync_organization_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.organizations
  set plan = new.plan,
      status = new.status,
      updated_at = now()
  where id = new.organization_id;
  return new;
end;
$$;

create trigger on_subscription_change
  after insert or update on public.subscriptions
  for each row execute function public.sync_organization_plan();
