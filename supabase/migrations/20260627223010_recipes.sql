create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  type text not null default 'food' check (type in ('food', 'beverage')),
  portions integer not null default 1 check (portions > 0),
  selling_price numeric(12, 2) not null default 0,
  labor_cost numeric(12, 4) not null default 0,
  packaging_cost numeric(12, 4) not null default 0,
  -- Beverage-only pour costing fields.
  bottle_size_ml numeric(10, 2),
  bottle_cost numeric(12, 2),
  pour_size_ml numeric(10, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_organization_id_idx on public.recipes (organization_id);

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  quantity numeric(12, 4) not null check (quantity > 0),
  unit text not null,
  created_at timestamptz not null default now()
);

create index recipe_items_recipe_id_idx on public.recipe_items (recipe_id);

alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;

create policy "recipes_select_member" on public.recipes
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "recipes_write_owner_manager" on public.recipes
  for all to authenticated
  using (public.is_org_manager_or_owner(organization_id))
  with check (public.is_org_manager_or_owner(organization_id));

-- recipe_items has no organization_id of its own; scope through its parent
-- recipe so it inherits the same RLS guarantee.
create policy "recipe_items_select_member" on public.recipe_items
  for select to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_org_member(r.organization_id)
    )
  );

create policy "recipe_items_write_owner_manager" on public.recipe_items
  for all to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_org_manager_or_owner(r.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_org_manager_or_owner(r.organization_id)
    )
  );

create trigger on_recipe_updated
  before update on public.recipes
  for each row execute function public.set_updated_at();
