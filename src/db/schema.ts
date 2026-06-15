import {
  pgTable,
  serial,
  text,
  integer,
  decimal,
  timestamp,
  unique,
} from "drizzle-orm/pg-core"

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const monthlyRecords = pgTable(
  "monthly_records",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    totalRevenue: decimal("total_revenue", {
      precision: 12,
      scale: 2,
    }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("monthly_records_product_period_unique").on(
      t.productId,
      t.month,
      t.year
    ),
  ]
)

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  recordId: integer("record_id")
    .notNull()
    .references(() => monthlyRecords.id, { onDelete: "cascade" }),
  serviceName: text("service_name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
})
