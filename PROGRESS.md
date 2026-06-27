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

- [ ] `is_super_admin` flag + guarded `/admin` shell (distinct theme)
- [ ] Platform dashboard (orgs, users, signups, MRR, plan distribution)
- [ ] Tenant list, drill-down, suspend/reactivate/change plan/extend trial/delete
- [ ] Read-only impersonation with audit logging
- [ ] Announcements, feature flags
- [ ] Searchable admin audit log

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
