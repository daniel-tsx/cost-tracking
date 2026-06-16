# Cost & Profit Tracker

A lightweight internal web app to manually track monthly maintenance costs and revenues across products, and visualize month-over-month profit margins.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (design-system tokens)
- **Theming:** next-themes (light / dark / system)
- **Database:** Neon (Serverless Postgres)
- **ORM:** Drizzle ORM
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

Copy `.env.local` and fill in your Neon connection string:

```
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
```

Push the database schema:

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
  app/
    layout.tsx              Root layout, theme provider, header
    page.tsx                Dashboard page (server)
    actions.ts              Server actions (CRUD + aggregation)
    products/page.tsx       Product management
    entries/page.tsx        Monthly entry list
    globals.css             Tailwind v4 theme tokens (light + dark)
  components/
    main-nav.tsx            Active-route navigation
    theme-provider.tsx      next-themes provider
    theme-toggle.tsx        Light/dark toggle
    dashboard-overview.tsx  Range selector, KPIs, breakdown
    dashboard-chart.tsx     Recharts composed chart
    entry-dialog.tsx        Create/edit entry form + validation
    add-entry-button.tsx    "Add entry" trigger
    entries-list.tsx        Entries table (expand, filter, sort)
    add-product-dialog.tsx  Product creation dialog
    products-table.tsx      Product list with edit/delete
    confirm-dialog.tsx      Reusable delete confirmation
    empty-state.tsx         Reusable empty state
    ui/                     shadcn / Base UI primitives
  db/
    schema.ts               Drizzle schema definitions
  lib/
    db.ts                   Database connection
    utils.ts                Utility functions
```

See [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) for theming tokens and layout patterns.
