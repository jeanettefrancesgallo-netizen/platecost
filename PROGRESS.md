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

- [ ] Ingredient Library + manageable categories (seeded café defaults, safe reassignment)
- [ ] Recipe / Menu Item Builder with unit conversion + live costing
- [ ] Beverage & Cocktail Pour Costing
- [ ] Pricing & Margin Calculator with target-based color coding
- [ ] Inventory Tracking (stock, par levels, low-stock alerts, adjustment log)
- [ ] Supplier Price History (timestamped, chart, spike flagging)
- [ ] Currency handling — PHP default, per-tenant override, exchange rates
- [ ] Tenant Dashboard (cards, cost % chart, menu-engineering table)
- [ ] Reports / PDF + CSV export

## Billing

- [ ] Plan tiers (Free / Pro / Enterprise) + feature gating
- [ ] Stripe test-mode subscriptions, Settings → Billing
- [ ] Stripe stubbed gracefully when keys are absent

## Quality gates (run before considering a feature done)

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run e2e` (happy path)
