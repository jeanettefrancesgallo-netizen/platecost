-- One row per organization. Created lazily by the app (or a default-insert
-- trigger) rather than eagerly here, since defaults already live in the
-- column definitions below.
create table public.organization_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  food_cost_target_min numeric(5, 2) not null default 28,
  food_cost_target_max numeric(5, 2) not null default 32,
  beverage_cost_target_min numeric(5, 2) not null default 18,
  beverage_cost_target_max numeric(5, 2) not null default 22,
  low_stock_alerts_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.organization_settings enable row level security;

create policy "org_settings_select_member" on public.organization_settings
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "org_settings_write_owner_manager" on public.organization_settings
  for all to authenticated
  using (public.is_org_manager_or_owner(organization_id))
  with check (public.is_org_manager_or_owner(organization_id));

create trigger on_org_settings_updated
  before update on public.organization_settings
  for each row execute function public.set_updated_at();

create function public.seed_default_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_settings (organization_id) values (new.id);
  return new;
end;
$$;

create trigger on_organization_created_seed_settings
  after insert on public.organizations
  for each row execute function public.seed_default_settings();
