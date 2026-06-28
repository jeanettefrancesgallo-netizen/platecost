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
      disappearing as pour size changes.
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
- [x] Supplier Price History (timestamped, chart, spike flagging) — the `price_history` table and
      its `on_ingredient_cost_change` trigger already existed from the foundation migrations
      (auto-recorded on every `purchase_unit_cost` edit); added the missing frontend: a "History"
      button per ingredient opens a dialog with a Recharts line chart of cost over time plus a
      full changelog table (old/new cost, % change). Any single change over +10% is flagged red as
      a spike — a heuristic threshold, not a measured fact, same pattern as the beverage over-pour
      flag. Verified live: seeded an ingredient, changed its cost four times via the real app
      flow (including one >10% jump), and confirmed the chart, table, and red spike badge all
      rendered correctly with no clipping.
- [ ] Currency handling — PHP default, per-tenant override, exchange rates
- [ ] Tenant Dashboard (cards, cost % chart, menu-engineering table)
- [x] Reports / PDF + CSV export — `/reports` page with three exportable reports (Menu Costing,
      Ingredient Cost List, Inventory Valuation by location), each reusing the same costing/
      currency logic as the rest of the app (`summarizeRecipe`, `cost_per_base_unit`) so figures
      stay consistent everywhere. CSV via PapaParse, PDF via jsPDF + jspdf-autotable. Verified live
      end-to-end with a seeded test org: all 6 export buttons produce real, correctly-formatted
      CSV/PDF files with accurate figures.

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
