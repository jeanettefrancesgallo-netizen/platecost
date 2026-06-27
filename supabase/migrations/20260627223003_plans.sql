-- Plan catalog. Public reference data — not tenant-scoped, readable by anyone
-- so the pricing/upgrade UI can render without auth. Only ever written by
-- migrations / the service role, never by tenant users.
create table public.plans (
  key text primary key,
  name text not null,
  max_locations integer, -- null = unlimited
  max_ingredients integer, -- null = unlimited
  max_members integer, -- null = unlimited
  price_monthly_usd numeric(10, 2) not null default 0,
  price_yearly_usd numeric(10, 2) not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

alter table public.plans enable row level security;

create policy "plans_select_all" on public.plans
  for select to anon, authenticated
  using (true);

insert into public.plans (key, name, max_locations, max_ingredients, max_members, price_monthly_usd, price_yearly_usd, sort_order)
values
  ('free', 'Free', 1, 50, 2, 0, 0, 0),
  ('pro', 'Pro', null, null, 10, 29, 290, 1),
  ('enterprise', 'Enterprise', null, null, null, 99, 990, 2);
