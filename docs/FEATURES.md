# Cost-tracking features & data model

**Status:** current

How the cost/profit features fit together, the schema behind them, and the CSV
import/export formats. Read this before changing the data model or the
entry/dashboard flows.

## Data model

All app tables are user-scoped (directly via `userId`, or transitively through
their product). Defined in `src/db/schema.ts`.

| Table | Purpose | Key columns |
|---|---|---|
| `products` | Tracked products | `userId`, `name`, `description`, `monthlyBudget` |
| `services` | Provider/service catalog | `userId`, `name` (unique per user), `category`, `billingUrl`, `defaultAmount`, `monthlyBudget`, `isShared`, `isActive` |
| `monthly_records` | One entry per product per period | `productId`, `month`, `year`, `totalRevenue`, `note`; unique `(productId, month, year)` |
| `expenses` | Cost line items on a record | `recordId`, `serviceId` (nullable link), `serviceName`, `amount` |
| `cost_templates` | Recurring expected costs | `userId`, `productId`, `serviceId`, `label`, `amount`, `isActive` |
| `shared_costs` | A shared service's monthly total | `userId`, `serviceId`, `label`, `month`, `year`, `totalAmount`, `method` |
| `shared_cost_allocations` | Per-product split of a shared cost | `sharedCostId`, `productId`, `weight` |
| `user_settings` | Per-account preferences | `userId` (PK), `currency`, `monthlyBudget` |

Indexes cover the common ownership/join/filter patterns: `products.userId`,
`services.userId`, `monthly_records.productId` and `(year, month)`,
`expenses.recordId` and `serviceId`, template/shared-cost relations.

`serviceId` links are `ON DELETE SET NULL`, so deleting a service keeps existing
expenses (with their free-text `serviceName`) intact — migration-compatible.

## Atomic writes

`neon-http` has no interactive transactions, so multi-statement writes use:

- **Create entry** — a single `WITH … INSERT … ` CTE statement (record +
  expenses commit or roll back together).
- **Update entry / shared cost** — `db.batch([...])`, which Neon runs as one
  HTTP transaction.

Ownership is re-checked before each mutation (see `prepareRecordWrite`).

## Currency

`user_settings.currency` (USD / VND / EUR) is read by every page and threaded
into `formatMoney` (`src/lib/currency.ts`). **No FX conversion** happens — all
values are entered and displayed in the selected currency. Changing currency
re-labels existing numbers; it does not convert them.

## Budgets & insights

Budgets live on products, services, and `user_settings` (global). The dashboard
`getInsights()` action compares the latest recorded month to the previous one
and emits: product cost changes, provider cost changes, missing entries for
historically-tracked products, and budget overages. Dashboard time ranges anchor
to the **latest recorded month**, not the calendar month.

Shared-cost allocations are folded into each product's monthly cost in
`getDashboardData()`, so KPIs, the chart, and insights all include them.

## CSV import / export

Export (Entries page → Export) produces one CSV per entity:

- `entries`: `product,year,month,totalRevenue,note`
- `expenses`: `product,year,month,serviceName,amount,category`
- `products`: `name,description,monthlyBudget`
- `services`: `name,category,billingUrl,defaultAmount,monthlyBudget,isShared,isActive`
- `templates`: `product,label,amount,isActive`

Import (Entries page → Import) accepts entry/expense rows with headers
`product,year,month,serviceName,amount,revenue`. Each row is one cost line; rows
are grouped into entries by product + period. Rules:

- Products must already exist (matched by name, case-insensitive).
- Each group becomes one entry whose expenses **fully replace** any existing
  ones for that period; `revenue` defaults to `0.00` when omitted.
- Import is a two-step **dry-run preview** (validation + create/update summary)
  then commit; invalid rows are reported and block the commit.
