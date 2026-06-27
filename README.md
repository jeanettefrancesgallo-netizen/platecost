# PlateCost

Multi-tenant Food & Beverage costing SaaS for cafés and coffee shops (and later restaurants,
catering, and bars). Ingredient costing, recipe/menu costing, beverage pour costing, pricing &
margin tools, inventory tracking, supplier price history, and reporting — all scoped per
Organization with Supabase Row-Level Security, plus a separate super-admin platform console.

See [PROGRESS.md](./PROGRESS.md) for the build checklist.

## Tech stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- React Router
- Supabase (Postgres, Auth, Row-Level Security)
- TanStack Query + Supabase JS client
- Recharts
- React Hook Form + Zod
- Stripe (test mode)
- jsPDF / Papa Parse for PDF/CSV export
- Vitest + React Testing Library, Playwright for e2e
- ESLint + Prettier

## Prerequisites

- Node.js 20+ and npm
- A [Supabase](https://supabase.com) project (free tier is fine for development)
- (Optional) A [Stripe](https://stripe.com) account in test mode, for billing

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy the env template and fill in your Supabase (and optionally Stripe) keys:

   ```sh
   cp .env.example .env.local
   ```

   | Variable | Where to find it |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
   | `VITE_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API |
   | `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard → Developers → API keys (test mode). Optional — billing UI is stubbed if unset. |

   Never commit `.env.local` or real secrets. The service-role key and Stripe secret key are
   server-side only and belong in Supabase Edge Function secrets, never in client env vars.

3. Apply database migrations to your Supabase project (see [Database](#database) below).

4. Run the dev server:

   ```sh
   npm run dev
   ```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Typecheck and build for production |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | TypeScript project check, no emit |
| `npm run lint` | ESLint |
| `npm run format` | Prettier, write mode |
| `npm run format:check` | Prettier, check mode |
| `npm run test` | Vitest unit/component tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run e2e` | Playwright end-to-end tests (run `npx playwright install` once first) |
| `npm run test:integration` | RLS isolation tests against your real Supabase project (needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`) |

## Database

Schema lives as SQL migrations in [supabase/migrations](./supabase/migrations), so the database
is reproducible. Using the [Supabase CLI](https://supabase.com/docs/guides/cli):

```sh
supabase link --project-ref <your-project-ref>
supabase db push
```

Every tenant-scoped table has Row-Level Security enabled — a signed-in user can only read/write
rows belonging to organizations they are a member of. The super-admin console bypasses tenant RLS
only via secure server-side Supabase Edge Functions using the service-role key; that key is never
shipped to the browser.

`npm run test:integration` verifies this against your real project by creating two throwaway
organizations and asserting one cannot read, list, or write into the other's rows, then cleans
both up. It needs `SUPABASE_SERVICE_ROLE_KEY` set (in `.env.local` or the shell) since it has to
create/delete test users via the admin API — never commit that key, and never expose it to the
browser/client code.

## Project structure

```
src/
  components/ui/   shadcn/ui components
  features/        feature-specific components, grouped by domain
  hooks/           shared React hooks
  lib/             supabase client, utilities
  pages/           route-level page components
  routes/          router configuration
  types/           shared TypeScript types
supabase/
  migrations/      SQL schema migrations
  functions/        Edge Functions (admin actions, Stripe webhooks)
e2e/               Playwright tests
```
