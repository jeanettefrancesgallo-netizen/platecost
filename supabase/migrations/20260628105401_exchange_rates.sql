-- Per-tenant exchange rates, keyed by purchase currency -> the org's base
-- currency. Lets an owner/manager set a rate once per currency instead of
-- re-entering it on every ingredient in that currency (the per-ingredient
-- exchange_rate_to_base field on `ingredients` still exists as the override
-- actually used for costing — this table is the source the ingredient form
-- defaults from).
create table public.organization_exchange_rates (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  currency_code text not null,
  rate_to_base numeric(12, 6) not null check (rate_to_base > 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, currency_code)
);

alter table public.organization_exchange_rates enable row level security;

create policy "org_exchange_rates_select_member" on public.organization_exchange_rates
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "org_exchange_rates_write_owner_manager" on public.organization_exchange_rates
  for all to authenticated
  using (public.is_org_manager_or_owner(organization_id))
  with check (public.is_org_manager_or_owner(organization_id));

create trigger on_org_exchange_rates_updated
  before update on public.organization_exchange_rates
  for each row execute function public.set_updated_at();
