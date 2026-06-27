create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.ingredient_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table public.suppliers enable row level security;
alter table public.ingredient_categories enable row level security;

create policy "suppliers_select_member" on public.suppliers
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "suppliers_write_owner_manager" on public.suppliers
  for all to authenticated
  using (public.is_org_manager_or_owner(organization_id))
  with check (public.is_org_manager_or_owner(organization_id));

create policy "categories_select_member" on public.ingredient_categories
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "categories_write_owner_manager" on public.ingredient_categories
  for all to authenticated
  using (public.is_org_manager_or_owner(organization_id))
  with check (public.is_org_manager_or_owner(organization_id));

-- Seed every new organization with the café-default category set.
create function public.seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ingredient_categories (organization_id, name, sort_order)
  values
    (new.id, 'Coffee Beans', 0),
    (new.id, 'Milk & Dairy', 1),
    (new.id, 'Syrups & Sauces', 2),
    (new.id, 'Pastry & Bakery', 3),
    (new.id, 'Tea', 4),
    (new.id, 'Cups & Packaging', 5),
    (new.id, 'Beverages', 6),
    (new.id, 'Dry Goods', 7),
    (new.id, 'Produce', 8),
    (new.id, 'Spirits', 9);
  return new;
end;
$$;

create trigger on_organization_created_seed_categories
  after insert on public.organizations
  for each row execute function public.seed_default_categories();

-- Safe category deletion: reassign affected ingredients to "Uncategorized"
-- (created on demand) instead of leaving them orphaned, then remove the
-- category. Called from the Category Manager UI in place of a raw DELETE.
create function public.delete_category_safely(p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_uncategorized_id uuid;
begin
  select organization_id into v_org_id
  from public.ingredient_categories
  where id = p_category_id;

  if v_org_id is null then
    raise exception 'Category not found.';
  end if;

  if not public.is_org_manager_or_owner(v_org_id) then
    raise exception 'Only an owner or manager can delete categories.';
  end if;

  select id into v_uncategorized_id
  from public.ingredient_categories
  where organization_id = v_org_id and name = 'Uncategorized';

  if v_uncategorized_id is null then
    insert into public.ingredient_categories (organization_id, name, sort_order)
    values (v_org_id, 'Uncategorized', 999)
    returning id into v_uncategorized_id;
  end if;

  update public.ingredients
  set category_id = v_uncategorized_id
  where category_id = p_category_id;

  delete from public.ingredient_categories where id = p_category_id;
end;
$$;
