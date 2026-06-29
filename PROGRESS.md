# PlateCost — Progress

## Foundation

- [x] Scaffold Vite + React + TypeScript
- [x] Tailwind CSS v4 + shadcn/ui (warm green/burnt-orange theme)
- [x] Core libraries installed: React Router, TanStack Query, Supabase JS, Recharts, React Hook
      Form + Zod, Stripe JS, jsPDF, Papa Parse
- [x] ESLint + Prettier configured (replacing the scaffold's default oxlint)
- [x] Vitest + React Testing Library configured, smoke test passing
- [x] Playwright configured, smoke e2e spec added
- [x] `.env.example`, `.gitignore`, README
- [x] Clean baseline committed to git
- [x] Database schema + RLS policy design reviewed with user
- [x] Supabase project connected, 12 migrations pushed and verified live

## Multi-tenancy & Auth

- [x] `organizations`, `organization_members`, `locations` tables + RLS
- [x] Signup → create organization → setup wizard → dashboard flow (verified in a real browser)
- [x] Org switcher in header

  Two real bugs found during a live owner walkthrough with a real account (not synthetic test
  data): (1) `DropdownMenuLabel` requires a `DropdownMenuGroup` wrapper in this Base UI version —
  used bare in `UserMenu`, it threw "MenuGroupContext is missing" and the whole menu popup failed
  to render, appearing completely blank. (2) Base UI's `Menu.Item` has no `onSelect` prop at all,
  only `onClick` — the shadcn wrapper spread it straight onto the underlying `<div>`, where
  `onSelect` is a real but unrelated React DOM event (text-selection, not clicks) that silently
  never fires. This meant **every** `DropdownMenuItem` using `onSelect` app-wide was non-functional
  with zero errors or warnings: logging out and switching organizations both did nothing. Fixed at
  the shared `DropdownMenuItem` component level (accepts `onSelect`, wires it to `onClick`) so the
  conventional prop name keeps working for any future caller instead of failing silently again.
  Verified live: confirmed the actual `/auth/v1/logout` network call now fires and redirects to
  `/login`, and that switching between two real orgs updates the dashboard correctly.
- [x] Role enforcement (Owner / Manager / Staff): Team page (invite/role-change/remove, owner-only,
      last-owner protected), Settings page (org name/currency, owner-only) — enforced in both RLS
      and UI, verified in a real browser with two actual logged-in roles
- [x] RLS isolation test (Org A cannot read Org B's rows) — `npm run test:integration`, passing against the live project
- [x] Fixed a real bug found while testing: the last-owner-protection trigger fired during the
      *cascading* delete of an organization's own membership rows, which made it impossible to
      ever delete an organization at all (including via the admin console). Fixed to skip the
      check once the parent organization row is already gone.

## Super-Admin Console

- [x] `is_super_admin` flag + guarded `/admin` shell (distinct dark theme, "Platform Admin" badge) —
      verified a non-admin is bounced to `/` and a flagged admin reaches the console
- [x] Platform dashboard (orgs, users, signups chart, MRR, plan distribution chart)
- [x] Tenant list (search/filter by status & plan), drill-down, suspend/reactivate/change
      plan/extend trial/delete (with confirmation) — verified live against the database
- [x] Audit logging for every mutating admin action + organization views (not full session
      impersonation — see note below)
- [x] Announcements, feature flags (CRUD)
- [x] Searchable admin audit log

  Architecture note: admin mutations and audit logging run through Postgres `SECURITY DEFINER`
  RPC functions (gated on `is_super_admin()`) rather than Supabase Edge Functions, since this
  environment has no Docker to build/test Edge Functions locally. Functionally equivalent —
  server-side only, service-role key never touches the browser — documented in the migration.
  "Read-only impersonate" is implemented as audit-logged drill-down visibility into tenant data,
  not full session impersonation (no Edge Function available to mint another user's session
  token); flag if true impersonation is required later.

## Core Tenant Features

- [x] Ingredient Library + manageable categories (seeded café defaults, safe reassignment to
      Uncategorized, reorder, rename, delete) — auto unit conversion (kg/g, L/ml, oz/fl oz →
      base unit) and live cost-per-base-unit preview while filling the form, normalized into the
      org's base currency. Search + category filter. Verified live in a real browser, including a
      fixed bug where the category/supplier dropdowns displayed raw UUIDs instead of names.
- [x] Recipe / Menu Item Builder with unit conversion + live costing — add ingredient lines by
      quantity + unit (converted into the ingredient's base unit), optional labor & packaging
      lines, total cost / cost per portion / cost % computed live and color-coded against the
      org's food or beverage cost target (green/amber/red), verified live with a real recipe
      (espresso beans + milk → exact expected cost % down to the decimal)
- [x] Beverage & Cocktail Pour Costing — bottle/keg size & cost → pour size → pours per bottle,
      cost per pour, pour cost % (shares the Recipes infrastructure: a beverage recipe's pour cost
      is folded in alongside any recipe_items mixers/garnish for full cocktail costing). Over-pour
      risk flag (heuristic: <15 pours/bottle) shown inline. Separate Beverages nav page filters
      `type = 'beverage'`; verified live including the over-pour warning actually appearing/
      disappearing as pour size changes. The bottle/pour fields used to show on every beverage
      recipe regardless of whether it actually involved a poured spirit, which a real café owner
      (testing with their actual menu) found genuinely confusing for a plain coffee drink — fixed
      by hiding them behind a "This is a poured spirit or cocktail" checkbox, defaulting to
      checked only when the recipe already has saved bottle/pour data.
- [x] Pricing & Margin Calculator basics (cost %, gross profit per portion, color-coded against
      target) folded into the Recipe Builder rather than a separate page — a standalone
      target-price-suggestion calculator is still open
- [x] Inventory Tracking — per-location stock on hand (multi-location, since `locations` already
      supported it), par/reorder levels (owner/manager only, via a new `set_inventory_levels` RPC
      since there's no direct write policy on `inventory_stock` by design), low-stock banner + per-row
      badge, stock-adjustment log (received/used/wasted/adjustment, any member can record — matches
      the brief's "Staff: limited entry"), recent-activity feed. Location Manager (add/rename/delete,
      plan-limit enforced server-side already). Verified live: received 30 → used 25 → correctly
      flagged low stock at the configured reorder level, with an accurate movement log.

  Real bug found during a live owner walkthrough (not synthetic test data): `apply_inventory_log()`
  treated every change_type other than `received` as a decrease, including `adjustment` — so there
  was no way to correct stock *upward* after a physical count (e.g. fixing an undercount), and
  "Adjustment" was silently identical to "Wasted"/"Used". A real adjustment entry intended to add
  12,000ml of milk instead subtracted it, driving stock to -23,976ml after a follow-up "wasted"
  entry compounded it. Fixed: `adjustment` is now a signed delta (positive adds, negative removes);
  the form now allows negative quantities for that type only, with a hint explaining the sign
  convention, and rejects zero. Verified live: corrected the actual corrupted stock value back to
  the owner's real on-hand count via a signed adjustment, confirmed in the database.

  Follow-up from the same walkthrough: the owner still had to do the subtraction themselves to use
  "Adjustment" correctly for a physical count (count vs. system value). Added a "Physical count"
  entry mode — type what you actually counted, the form computes and logs the right signed
  adjustment for you (a UI convenience over the same `adjustment` change_type, not a new one;
  matching counts are a no-op, nothing gets logged). Relabeled the type dropdown for clearer
  accounting language: Purchases (restock) / Used / Wastage-spoilage / Adjustment (known amount) /
  Physical count (ending inventory). Verified live: seeded 5000ml, entered a physical count of
  3200ml, confirmed the log shows a computed `adjustment -1800` and stock reads 3200; re-entering
  the same count a second time correctly added no new log row.
- [x] Supplier Price History (timestamped, chart, spike flagging) — the `price_history` table and
      its `on_ingredient_cost_change` trigger already existed from the foundation migrations
      (auto-recorded on every `purchase_unit_cost` edit); added the missing frontend: a "History"
      button per ingredient opens a dialog with a Recharts line chart of cost over time plus a
      full changelog table (old/new cost, % change). Any single change over +10% is flagged red as
      a spike — a heuristic threshold, not a measured fact, same pattern as the beverage over-pour
      flag. Verified live: seeded an ingredient, changed its cost four times via the real app
      flow (including one >10% jump), and confirmed the chart, table, and red spike badge all
      rendered correctly with no clipping.
- [x] Currency handling — PHP default at signup, per-tenant override (Settings → Organization, was
      already in place), and now centralized exchange rates: a new `organization_exchange_rates`
      table (org-scoped RLS, owner/manager write) lets an owner set "1 USD = X PHP" once instead of
      retyping it on every ingredient. Settings → Currency tab manages the rates; the ingredient
      form now defaults `exchangeRateToBase` from the org's saved rate when creating a new
      ingredient in a foreign currency (still overridable per ingredient, and untouched when
      editing an existing one). Verified live: saved a rate in Settings, confirmed it landed in the
      database, then opened "Add ingredient," switched currency to USD, and watched the exchange
      rate field auto-fill with the saved value.
- [x] Tenant Dashboard (cards, cost % chart, menu-engineering table) — replaced the static
      placeholder with real data: summary cards (recipe count, avg cost %, ingredient count,
      org-wide low-stock count), a Recharts bar chart of cost % per recipe (top 10, color-coded
      against each recipe's food/beverage target band), and a menu-engineering table classifying
      each priced recipe into Star/Plowhorse/Puzzle/Dog. Since this app has no POS/sales
      integration, the popularity axis is approximated with cost % vs. the org average instead of
      real sales mix — documented in the UI and in `classifyMenuEngineering` (new, unit-tested in
      `recipeCosting.test.ts`) as a stand-in, not a verified sales classification. Caught and fixed
      a real bug while verifying live: Recharts' bar entrance animation restarted on every
      `useQuery` resolution (each one a new `chartData` array reference), so bars never finished
      animating in and stayed stuck near-zero height — fixed with `isAnimationActive={false}`,
      verified by inspecting actual rendered bar heights match.
- [x] Reports / PDF + CSV export — `/reports` page with three exportable reports (Menu Costing,
      Ingredient Cost List, Inventory Valuation by location), each reusing the same costing/
      currency logic as the rest of the app (`summarizeRecipe`, `cost_per_base_unit`) so figures
      stay consistent everywhere. CSV via PapaParse, PDF via jsPDF + jspdf-autotable. Verified live
      end-to-end with a seeded test org: all 6 export buttons produce real, correctly-formatted
      CSV/PDF files with accurate figures.
- [x] Cost of Goods Sold report (Beginning + Purchases − Ending), per user request — reconstructs
      beginning/ending inventory for a chosen date range from the existing `inventory_log` history
      rather than needing a new snapshot table: quantity at any point in time = current quantity
      on hand minus the net of every signed movement since that point. Simplification, documented
      in the UI: every quantity is valued at the ingredient's *current* cost, not the price
      actually paid at the time of each movement, so this is a quick gut-check figure, not true
      historical-cost accounting. Verified live against the real owner's actual data: a clean
      same-day period correctly shows ₱0 COGS for every ingredient (nothing's been sold/used yet,
      only received/wasted/adjusted), and the default this-month period correctly isolates a known
      artifact to exactly the one ingredient (milk) whose history includes a row recorded before
      the inventory-adjustment-sign fix above — not a bug in this feature, a known consequence of
      reconstructing history through an earlier, now-fixed bug.

## Billing

- [x] Plan tiers (Free / Pro / Enterprise) + feature gating (plan limits already enforced
      server-side via triggers from the foundation migrations)
- [x] **Manual billing (no Stripe, per user request)** — GCash / bank transfer instead of card
      payments: tenant Settings → Billing shows current plan/status/renewal/usage, an "Upgrade
      plan" flow displays the platform's configured payment methods (GCash number + account name
      seeded as live data — intentionally not committed to git, since it's personal payment info)
      and PHP/USD list prices, the owner submits a reference number, and a platform admin reviews
      and approves/rejects from `/admin/payments` (also where GCash/bank entries are managed).
      Approval activates the subscription via a `SECURITY DEFINER` RPC (same pattern as the rest
      of the admin console) that updates `subscriptions` and, through the existing sync trigger,
      `organizations.plan/status`. Verified the complete loop live: submit → pending → admin
      approve → tenant sees Pro/active with the correct renewal date — and confirmed in the
      database directly, not just the UI.
- [x] Stripe stubbed gracefully when keys are absent (moot now — no Stripe integration at all per
      this request, but `@stripe/stripe-js` stays installed in case card payments are added later)

  Bug fixed along the way: Base UI's `Select` doesn't reactively re-resolve its displayed label if
  the bound `value` didn't match any `<SelectItem>` at first mount (e.g. while the plans list was
  still loading) — it stays stuck on the placeholder even after the matching item appears. Fixed by
  not mounting the plan/payment-method selects until their data has actually loaded, rather than
  guessing a default value before any item exists for it.

## Quality gates (run before considering a feature done)

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run e2e` (happy path)

## CI

- [x] GitHub Actions workflow (`.github/workflows/ci.yml`): typecheck/lint/unit-test/build always;
      Playwright smoke test with placeholder Supabase env vars if real secrets aren't configured;
      RLS integration test against the live project, gated to skip until
      `SUPABASE_SERVICE_ROLE_KEY` (+ the two `VITE_SUPABASE_*` keys) are added as repo secrets.
      Verified locally end-to-end before committing: ran the build and the e2e smoke test with
      placeholder env vars (the exact condition CI hits before secrets are added) to confirm
      neither breaks without real credentials. Not yet exercised by an actual GitHub Actions run —
      this repo has no GitHub remote yet, so the workflow activates the first time it's pushed.
