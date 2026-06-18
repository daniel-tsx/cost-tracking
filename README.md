<img src="public/logo.svg" alt="CostTracker" width="220" />

# Cost & Profit Tracker

A lightweight internal web app to manually track monthly maintenance costs and revenues across products, and visualize month-over-month profit margins.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (design-system tokens)
- **Theming:** next-themes (light / dark / system)
- **Database:** Neon (Serverless Postgres)
- **ORM:** Drizzle ORM
- **Auth:** better-auth (email/password) — per-user data isolation
- **Email:** Resend (password-reset delivery)
- **UI:** shadcn / Base UI components
- **Charts:** Recharts
- **Package Manager:** pnpm

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- A [Neon](https://neon.tech) database

### Setup

```bash
pnpm install
```

Copy `.env.example` to `.env.local` and fill it in:

```
# Neon Postgres connection string
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require

# Auth (better-auth) — generate a secret with: openssl rand -base64 32
BETTER_AUTH_SECRET=your-32-byte-secret
BETTER_AUTH_URL=http://localhost:3000

# Resend — required for real password-reset emails.
# If RESEND_API_KEY is empty, the reset link is logged to the server console.
RESEND_API_KEY=
EMAIL_FROM=CostTracker <onboarding@resend.dev>

# Signup gating (optional, recommended for a personal deployment).
# If both are empty, anyone can sign up. Set at least one to lock it down.
SIGNUP_INVITE_CODE=
SIGNUP_ALLOWED_EMAILS=
```

Push the database schema (creates the app tables **and** the auth tables):

```bash
pnpm db:push
```

Start the dev server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Dashboard** — Time ranges (6M / 12M / YTD / All) **anchored to the latest recorded month** drive KPI cards (revenue, costs, profit, margin) with period deltas, a composed revenue/cost/profit + margin chart, an **insights panel** (variance, missing entries, budget warnings), and **cost-by-category / cost-by-provider** breakdowns plus profit-by-product.
- **Products** — Add, edit, and delete tracked products with an optional monthly cost **budget**.
- **Services** — A provider catalog (AI, Database, Hosting, Email, Storage, Analytics, Domain, Monitoring, Other) with default cost, monthly budget, billing URL, and active/shared flags. Expenses can link to a service so costs aggregate across products.
- **Monthly Entries** — Create/edit entries with multiple cost items per product per month, a **note** field, and the fastest paths to fill them: **copy last month**, **prefill from templates**, and **add from the service catalog**. Expandable rows show the per-service breakdown and computed cost/profit/margin; filter / sort / search included.
- **Recurring templates** — Per product/service expected costs that prefill new entries in one click.
- **Shared costs** — Split a shared service across products by **equal / percentage / fixed** allocation; allocated amounts roll into each product's monthly totals.
- **Budgets & alerts** — Per-product, per-service, and a global monthly budget; the dashboard flags overages in-app.
- **Currency** — Account-level currency (USD / VND / EUR), applied everywhere. Values are entered and shown in the chosen currency — no FX conversion.
- **CSV import / export** — Export entries, expenses, products, services, and templates; import monthly entries/expenses with a validated dry-run preview.
- **One entry per period** — A unique constraint on `(product, month, year)` prevents double-counting; the form surfaces a friendly message. Entry writes are **atomic** (single CTE / batched transaction).
- **Light / dark theme** — System-aware theme on design-system tokens.
- **Accounts & security** — Email/password auth with forgot/reset and change-password. Signup can be gated by invite code and/or email allowlist. Every account only sees its own data; all pages are gated and all server actions re-check ownership and validate input.

## Database Commands

| Command | Description |
|---|---|
| `pnpm db:push` | Push schema directly to database |
| `pnpm db:generate` | Generate SQL migration files |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Open Drizzle Studio |

## Project Structure

```
src/
  proxy.ts                  Auth route guard (redirects to /login; Next 16 proxy)
  app/
    layout.tsx              Root layout (fonts + theme provider)
    globals.css             Tailwind v4 theme tokens (light + dark)
    actions.ts              Server actions (CRUD + aggregation, user-scoped)
    api/auth/[...all]/      better-auth request handler
    (auth)/                 Public auth pages (centered, no app chrome)
      login, signup, forgot-password, reset-password
    (app)/                  Authenticated app (header + nav + user menu)
      page.tsx              Dashboard (KPIs, chart, insights, breakdowns)
      products/, entries/   Product + entry management
      services/             Provider/service catalog
      templates/            Recurring cost templates
      shared-costs/         Shared-cost allocation
      account/              Account settings (currency, budget, password)
  components/
    main-nav, theme-*, user-menu, logo
    dashboard-overview/-chart, entry-dialog, entries-list
    products-table, add-*-dialog/button, import-export-bar
    services-manager, templates-manager, shared-cost-manager
    account-settings-form, toggle-field
    change-password-form, confirm-dialog, empty-state
    ui/                     shadcn / Base UI primitives
  db/
    schema.ts               App schema (products, services, records, expenses,
                            templates, shared costs, settings; re-exports auth)
    auth-schema.ts          better-auth tables (generated)
  lib/
    auth.ts                 better-auth server config (+ signup gate)
    auth-client.ts          better-auth React client
    auth-helpers.ts         getSessionUser / requireUserId
    validation.ts           zod schemas for all server actions
    currency.ts             currency-aware money formatting
    db.ts, utils.ts
```

See [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) for theming tokens and layout
patterns, [docs/AUTH.md](docs/AUTH.md) for the authentication model, and
[docs/FEATURES.md](docs/FEATURES.md) for the cost-tracking data model, features,
and CSV formats.

> **After pulling these changes, run `pnpm db:push`** to create the new tables
> and columns (services, templates, shared costs, settings, budgets, notes).
