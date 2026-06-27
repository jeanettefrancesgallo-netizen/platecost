create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category_id uuid references public.ingredient_categories (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  name text not null,
  base_unit text not null check (base_unit in ('g', 'ml', 'each')),
  purchase_unit text not null,
  purchase_unit_quantity numeric(12, 4) not null check (purchase_unit_quantity > 0),
  purchase_unit_cost numeric(12, 4) not null check (purchase_unit_cost >= 0),
  purchase_currency text not null default 'PHP',
  exchange_rate_to_base numeric(12, 6) not null default 1,
  yield_percent numeric(5, 2) not null default 100 check (yield_percent > 0 and yield_percent <= 100),
  -- cost per base unit (g / ml / each), normalized into the purchase currency,
  -- accounting for yield loss. Multiply by exchange_rate_to_base in the app
  -- layer to display in the org's base_currency.
  cost_per_base_unit numeric(12, 6) generated always as (
    (purchase_unit_cost / purchase_unit_quantity) / (yield_percent / 100)
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ingredients_organization_id_idx on public.ingredients (organization_id);
create index ingredients_category_id_idx on public.ingredients (category_id);

create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  old_cost numeric(12, 4) not null,
  new_cost numeric(12, 4) not null,
  currency text not null,
  changed_by uuid references public.profiles (id),
  changed_at timestamptz not null default now()
);

create index price_history_ingredient_id_idx on public.price_history (ingredient_id);

alter table public.ingredients enable row level security;
alter table public.price_history enable row level security;

create policy "ingredients_select_member" on public.ingredients
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "ingredients_write_owner_manager" on public.ingredients
  for all to authenticated
  using (public.is_org_manager_or_owner(organization_id))
  with check (public.is_org_manager_or_owner(organization_id));

create policy "price_history_select_member" on public.price_history
  for select to authenticated
  using (public.is_org_member(organization_id));

-- price_history rows are only ever written by the trigger below, never
-- directly by clients, so no INSERT/UPDATE/DELETE policy is granted.

create function public.record_ingredient_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.purchase_unit_cost is distinct from old.purchase_unit_cost then
    insert into public.price_history (ingredient_id, organization_id, old_cost, new_cost, currency, changed_by)
    values (new.id, new.organization_id, old.purchase_unit_cost, new.purchase_unit_cost, new.purchase_currency, auth.uid());
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_ingredient_cost_change
  before update on public.ingredients
  for each row execute function public.record_ingredient_price_change();
