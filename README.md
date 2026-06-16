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

- **Dashboard** — Selectable time range (6M / 12M / YTD / All) driving KPI cards (revenue, costs, profit, margin) with period-over-period deltas, a composed chart (revenue/cost/profit bars + a profit-margin trend line), and a profit-by-product breakdown.
- **Products** — Add, edit, and delete the products you track, with delete confirmation.
- **Monthly Entries** — Create and **edit** entries with multiple cost items per product per month; expandable rows reveal the per-service cost breakdown and computed cost/profit/margin. Includes inline validation, a live projected-profit preview, and filter / sort / search.
- **One entry per period** — A unique constraint on `(product, month, year)` prevents duplicate entries that would double-count; the form surfaces a friendly message instead of failing.
- **Light / dark theme** — System-aware theme with a header toggle, built entirely on design-system tokens.
- **Accounts & security** — Email/password sign-up and sign-in, with forgot/reset and change-password flows. Every account only sees its own products and entries; all pages are gated behind authentication.

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
  middleware.ts             Auth route guard (redirects to /login)
  app/
    layout.tsx              Root layout (fonts + theme provider)
    globals.css             Tailwind v4 theme tokens (light + dark)
    actions.ts              Server actions (CRUD + aggregation, user-scoped)
    api/auth/[...all]/      better-auth request handler
    (auth)/                 Public auth pages (centered, no app chrome)
      login, signup, forgot-password, reset-password
    (app)/                  Authenticated app (header + nav + user menu)
      page.tsx              Dashboard
      products/, entries/   Product + entry management
      account/             Account settings (change password)
  components/
    main-nav, theme-*, user-menu, logo
    dashboard-overview/-chart, entry-dialog, entries-list
    products-table, add-*-dialog/button
    change-password-form, confirm-dialog, empty-state
    ui/                     shadcn / Base UI primitives
  db/
    schema.ts               App schema (re-exports auth-schema)
    auth-schema.ts          better-auth tables (generated)
  lib/
    auth.ts                 better-auth server config
    auth-client.ts          better-auth React client
    auth-helpers.ts         getSessionUser / requireUserId
    db.ts, utils.ts
```

See [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) for theming tokens and layout patterns, and [docs/AUTH.md](docs/AUTH.md) for the authentication model.
