create table public.inventory_stock (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  quantity_on_hand numeric(12, 4) not null default 0,
  par_level numeric(12, 4) not null default 0,
  reorder_level numeric(12, 4) not null default 0,
  updated_at timestamptz not null default now(),
  unique (location_id, ingredient_id)
);

create table public.inventory_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  change_type text not null check (change_type in ('received', 'used', 'wasted', 'adjustment')),
  quantity numeric(12, 4) not null,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index inventory_stock_org_idx on public.inventory_stock (organization_id);
create index inventory_log_org_idx on public.inventory_log (organization_id);

alter table public.inventory_stock enable row level security;
alter table public.inventory_log enable row level security;

create policy "inventory_stock_select_member" on public.inventory_stock
  for select to authenticated
  using (public.is_org_member(organization_id));

-- Stock levels are only ever mutated by the inventory_log trigger below.
create policy "inventory_log_select_member" on public.inventory_log
  for select to authenticated
  using (public.is_org_member(organization_id));

-- Any member (including staff) can record stock movements — "limited entry"
-- per the brief — but not edit or delete history after the fact.
create policy "inventory_log_insert_member" on public.inventory_log
  for insert to authenticated
  with check (public.is_org_member(organization_id));

create function public.apply_inventory_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta numeric(12, 4);
begin
  v_delta := case
    when new.change_type = 'received' then new.quantity
    else -abs(new.quantity)
  end;

  insert into public.inventory_stock (organization_id, location_id, ingredient_id, quantity_on_hand)
  values (new.organization_id, new.location_id, new.ingredient_id, v_delta)
  on conflict (location_id, ingredient_id)
  do update set
    quantity_on_hand = public.inventory_stock.quantity_on_hand + v_delta,
    updated_at = now();

  return new;
end;
$$;

create trigger on_inventory_log_insert
  after insert on public.inventory_log
  for each row execute function public.apply_inventory_log();
