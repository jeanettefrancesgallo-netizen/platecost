-- Restructures the plan catalog from Free/Pro/Enterprise to the finalized
-- Free/Starter/Growth/Pro tiers (per user-provided pricing package). Pro is
-- not yet purchasable ("Coming Soon") - is_active=false hides it from the
-- customer-facing upgrade flow (usePlans() filters is_active=true) without
-- blocking a platform admin from assigning it manually later.

alter table public.plans add column max_recipes integer; -- null = unlimited

insert into public.plans (
  key, name, max_locations, max_recipes, max_ingredients, max_members,
  price_monthly_php, price_yearly_php, price_monthly_usd, price_yearly_usd,
  is_active, sort_order
) values (
  'starter', 'Starter', 1, null, null, 3,
  599, 5990, 11, 110,
  true, 1
), (
  'growth', 'Growth', null, null, null, 10,
  1499, 14990, 29, 290,
  true, 2
);

-- The one real existing subscriber was on the old 'pro' ($1500/mo) — the
-- closest match to the new Growth tier ($1499/mo) — so migrate them across
-- before 'pro' is redefined to mean the new (different, not-yet-released)
-- Pro tier. Historical payment_submissions.amount is left untouched; only
-- the plan classification moves.
update public.organizations set plan = 'growth' where plan = 'pro';
update public.subscriptions set plan = 'growth' where plan = 'pro';
update public.payment_submissions set plan = 'growth' where plan = 'pro';

update public.plans set
  max_recipes = 5,
  max_ingredients = 20,
  max_members = 1
where key = 'free';

update public.plans set
  name = 'Pro',
  max_locations = null,
  max_recipes = null,
  max_ingredients = null,
  max_members = null,
  price_monthly_php = 0,
  price_yearly_php = 0,
  price_monthly_usd = 0,
  price_yearly_usd = 0,
  is_active = false,
  sort_order = 3
where key = 'pro';

update public.plans set sort_order = 0 where key = 'free';

delete from public.plans where key = 'enterprise';

-- Recipes get the same plan-limit enforcement pattern as locations,
-- ingredients, and members.
create function public.check_recipe_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_plan_limit(
    new.organization_id,
    'max_recipes',
    (select count(*) from public.recipes where organization_id = new.organization_id)
  );
  return new;
end;
$$;

create trigger on_recipe_insert_check_limit
  before insert on public.recipes
  for each row execute function public.check_recipe_limit();
