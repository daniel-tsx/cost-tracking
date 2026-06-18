"use server"

import { db } from "@/lib/db"
import {
  products,
  monthlyRecords,
  expenses,
  services,
  costTemplates,
  sharedCosts,
  sharedCostAllocations,
  userSettings,
} from "@/db/schema"
import { and, eq, sql, desc, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireUserId } from "@/lib/auth-helpers"
import {
  parse,
  productSchema,
  monthlyRecordSchema,
  serviceSchema,
  templateSchema,
  sharedCostSchema,
  settingsSchema,
  type Currency,
  type AllocationMethod,
} from "@/lib/validation"
import { formatMoney } from "@/lib/currency"

async function ownedProductIds(userId: string): Promise<number[]> {
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.userId, userId))
  return rows.map((r) => r.id)
}

/** Returns the subset of the given service ids that belong to the user. */
async function ownedServiceIds(
  userId: string,
  ids: number[]
): Promise<Set<number>> {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return new Set()
  const rows = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.userId, userId), inArray(services.id, unique)))
  return new Set(rows.map((r) => r.id))
}

export async function getProducts() {
  const userId = await requireUserId()
  return db
    .select()
    .from(products)
    .where(eq(products.userId, userId))
    .orderBy(products.name)
}

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function createProduct(
  name: string,
  description: string,
  monthlyBudget?: string
): Promise<ActionResult> {
  const userId = await requireUserId()
  const parsed = parse(productSchema, { name, description, monthlyBudget })
  if (!parsed.ok) return { ok: false, error: parsed.error }

  await db.insert(products).values({
    userId,
    name: parsed.data.name,
    description: parsed.data.description,
    monthlyBudget: parsed.data.monthlyBudget,
  })
  revalidatePath("/products")
  return { ok: true }
}

export async function updateProduct(
  id: number,
  name: string,
  description: string,
  monthlyBudget?: string
): Promise<ActionResult> {
  const userId = await requireUserId()
  const parsed = parse(productSchema, { name, description, monthlyBudget })
  if (!parsed.ok) return { ok: false, error: parsed.error }

  await db
    .update(products)
    .set({
      name: parsed.data.name,
      description: parsed.data.description,
      monthlyBudget: parsed.data.monthlyBudget,
    })
    .where(and(eq(products.id, id), eq(products.userId, userId)))
  revalidatePath("/products")
  revalidatePath("/")
  return { ok: true }
}

export async function deleteProduct(id: number) {
  const userId = await requireUserId()
  await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.userId, userId)))
  revalidatePath("/products")
  revalidatePath("/")
}

export type ExpenseInput = {
  serviceName: string
  amount: string
  serviceId?: number | null
}

export type MonthlyRecordInput = {
  productId: number
  month: number
  year: number
  totalRevenue: string
  note?: string | null
  expenseItems: ExpenseInput[]
}

const DUPLICATE_PERIOD_MSG =
  "An entry for this product and period already exists. Edit the existing entry instead."

function isDuplicatePeriodError(e: unknown): boolean {
  // Drizzle wraps DB errors in DrizzleQueryError, so the Postgres code
  // (23505) and constraint name live on the `cause` chain, not the top error.
  let cur = e as { code?: string; message?: string; cause?: unknown } | undefined
  for (let i = 0; i < 4 && cur; i++) {
    if (cur.code === "23505") return true
    if (
      typeof cur.message === "string" &&
      (cur.message.includes("monthly_records_product_period_unique") ||
        cur.message.toLowerCase().includes("duplicate key"))
    ) {
      return true
    }
    cur = cur.cause as typeof cur
  }
  return false
}

/** Validate input + verify product/service ownership for a record write. */
async function prepareRecordWrite(userId: string, input: MonthlyRecordInput) {
  const parsed = parse(monthlyRecordSchema, input)
  if (!parsed.ok) return { ok: false as const, error: parsed.error }

  const owned = await ownedProductIds(userId)
  if (!owned.includes(parsed.data.productId)) {
    return { ok: false as const, error: "Product not found." }
  }

  const serviceIds = parsed.data.expenseItems
    .map((e) => e.serviceId)
    .filter((id): id is number => typeof id === "number")
  const validServices = await ownedServiceIds(userId, serviceIds)
  const items = parsed.data.expenseItems.map((e) => ({
    serviceName: e.serviceName,
    amount: e.amount,
    // Drop links to services the user doesn't own; keep the free-text name.
    serviceId: e.serviceId && validServices.has(e.serviceId) ? e.serviceId : null,
  }))

  return { ok: true as const, data: parsed.data, owned, items }
}

export async function createMonthlyRecord(
  input: MonthlyRecordInput
): Promise<ActionResult> {
  const userId = await requireUserId()
  const prep = await prepareRecordWrite(userId, input)
  if (!prep.ok) return { ok: false, error: prep.error }
  const { data, items } = prep
  const { productId, month, year, totalRevenue, note } = data

  try {
    if (items.length === 0) {
      await db.insert(monthlyRecords).values({
        productId,
        month,
        year,
        totalRevenue,
        note,
      })
    } else {
      // Single CTE statement = atomic: the record and its expenses commit or
      // roll back together (neon-http has no interactive transactions).
      const values = items.map(
        (e) =>
          sql`(${e.serviceName}::text, ${e.amount}::numeric, ${e.serviceId}::integer)`
      )
      await db.execute(sql`
        WITH r AS (
          INSERT INTO monthly_records (product_id, month, year, total_revenue, note)
          VALUES (${productId}, ${month}, ${year}, ${totalRevenue}::numeric, ${note})
          RETURNING id
        )
        INSERT INTO expenses (record_id, service_name, amount, service_id)
        SELECT r.id, v.service_name, v.amount, v.service_id
        FROM r, (VALUES ${sql.join(values, sql`, `)})
          AS v(service_name, amount, service_id)
      `)
    }
  } catch (e) {
    if (isDuplicatePeriodError(e)) return { ok: false, error: DUPLICATE_PERIOD_MSG }
    throw e
  }

  revalidatePath("/entries")
  revalidatePath("/")
  return { ok: true }
}

export async function updateMonthlyRecord(
  id: number,
  input: MonthlyRecordInput
): Promise<ActionResult> {
  const userId = await requireUserId()
  const prep = await prepareRecordWrite(userId, input)
  if (!prep.ok) return { ok: false, error: prep.error }
  const { data, owned, items } = prep
  const { productId, month, year, totalRevenue, note } = data

  // Authorize the target record before mutating, so a forged id can't delete
  // another user's expenses via the recordId-scoped delete below.
  const [rec] = await db
    .select({ id: monthlyRecords.id })
    .from(monthlyRecords)
    .innerJoin(products, eq(monthlyRecords.productId, products.id))
    .where(and(eq(monthlyRecords.id, id), eq(products.userId, userId)))
  if (!rec) return { ok: false, error: "Entry not found." }

  const updateQ = db
    .update(monthlyRecords)
    .set({ productId, month, year, totalRevenue, note })
    .where(
      and(eq(monthlyRecords.id, id), inArray(monthlyRecords.productId, owned))
    )
  const deleteQ = db.delete(expenses).where(eq(expenses.recordId, id))

  try {
    if (items.length > 0) {
      const insertQ = db.insert(expenses).values(
        items.map((e) => ({
          recordId: id,
          serviceName: e.serviceName,
          amount: e.amount,
          serviceId: e.serviceId,
        }))
      )
      await db.batch([updateQ, deleteQ, insertQ])
    } else {
      await db.batch([updateQ, deleteQ])
    }
  } catch (e) {
    if (isDuplicatePeriodError(e)) return { ok: false, error: DUPLICATE_PERIOD_MSG }
    throw e
  }

  revalidatePath("/entries")
  revalidatePath("/")
  return { ok: true }
}

export type DashboardRow = {
  productId: number
  productName: string | null
  month: number
  year: number
  revenue: number
  cost: number
}

export async function getDashboardData(): Promise<DashboardRow[]> {
  const userId = await requireUserId()
  const records = await db
    .select({
      id: monthlyRecords.id,
      productId: monthlyRecords.productId,
      month: monthlyRecords.month,
      year: monthlyRecords.year,
      totalRevenue: monthlyRecords.totalRevenue,
      productName: products.name,
      cost: sql<string>`COALESCE(SUM(${expenses.amount}), '0')`.as("total_cost"),
    })
    .from(monthlyRecords)
    .innerJoin(products, eq(monthlyRecords.productId, products.id))
    .leftJoin(expenses, eq(monthlyRecords.id, expenses.recordId))
    .where(eq(products.userId, userId))
    .groupBy(monthlyRecords.id, products.name)
    .orderBy(monthlyRecords.year, monthlyRecords.month)

  const base: DashboardRow[] = records.map((r) => ({
    productId: r.productId,
    productName: r.productName,
    month: r.month,
    year: r.year,
    revenue: Number(r.totalRevenue),
    cost: Number(r.cost),
  }))

  // Fold allocated shared costs into each product-period's cost so monthly
  // totals reflect them. Allocation-only periods appear as cost-only rows.
  const allocated = await getAllocatedCosts()
  if (allocated.length === 0) return base

  const nameById = new Map<number, string | null>()
  for (const r of base) nameById.set(r.productId, r.productName)
  const missing = [...new Set(allocated.map((a) => a.productId))].filter(
    (id) => !nameById.has(id)
  )
  if (missing.length > 0) {
    const prods = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(and(eq(products.userId, userId), inArray(products.id, missing)))
    for (const p of prods) nameById.set(p.id, p.name)
  }

  const map = new Map<string, DashboardRow>()
  for (const r of base) map.set(`${r.productId}:${r.year}:${r.month}`, { ...r })
  for (const a of allocated) {
    const key = `${a.productId}:${a.year}:${a.month}`
    const existingRow = map.get(key)
    if (existingRow) existingRow.cost += a.amount
    else
      map.set(key, {
        productId: a.productId,
        productName: nameById.get(a.productId) ?? null,
        month: a.month,
        year: a.year,
        revenue: 0,
        cost: a.amount,
      })
  }
  return [...map.values()]
}

export type RecordExpense = {
  id: number
  serviceName: string
  amount: string
  serviceId: number | null
}

export type MonthlyRecord = {
  id: number
  productId: number
  productName: string | null
  month: number
  year: number
  totalRevenue: string
  note: string | null
  expenses: RecordExpense[]
}

export async function getMonthlyRecords(): Promise<MonthlyRecord[]> {
  const userId = await requireUserId()
  const records = await db
    .select({
      id: monthlyRecords.id,
      productId: monthlyRecords.productId,
      month: monthlyRecords.month,
      year: monthlyRecords.year,
      totalRevenue: monthlyRecords.totalRevenue,
      note: monthlyRecords.note,
      productName: products.name,
    })
    .from(monthlyRecords)
    .innerJoin(products, eq(monthlyRecords.productId, products.id))
    .where(eq(products.userId, userId))
    .orderBy(
      desc(monthlyRecords.year),
      desc(monthlyRecords.month),
      desc(monthlyRecords.id)
    )

  if (records.length === 0) return []

  const rows = await db
    .select()
    .from(expenses)
    .where(
      inArray(
        expenses.recordId,
        records.map((r) => r.id)
      )
    )

  const byRecord = new Map<number, RecordExpense[]>()
  for (const e of rows) {
    const list = byRecord.get(e.recordId) ?? []
    list.push({
      id: e.id,
      serviceName: e.serviceName,
      amount: e.amount,
      serviceId: e.serviceId,
    })
    byRecord.set(e.recordId, list)
  }

  return records.map((r) => ({ ...r, expenses: byRecord.get(r.id) ?? [] }))
}

export async function deleteMonthlyRecord(id: number) {
  const userId = await requireUserId()
  const owned = await ownedProductIds(userId)
  if (owned.length === 0) return
  await db
    .delete(monthlyRecords)
    .where(and(eq(monthlyRecords.id, id), inArray(monthlyRecords.productId, owned)))
  revalidatePath("/entries")
  revalidatePath("/")
}

function isUniqueViolation(e: unknown): boolean {
  let cur = e as { code?: string; cause?: unknown } | undefined
  for (let i = 0; i < 4 && cur; i++) {
    if (cur.code === "23505") return true
    cur = cur.cause as typeof cur
  }
  return false
}

// ── User settings (currency + global budget) ───────────────────────────────

export type UserSettings = { currency: Currency; monthlyBudget: string | null }

export async function getUserSettings(): Promise<UserSettings> {
  const userId = await requireUserId()
  const [row] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
  return {
    currency: (row?.currency as Currency) ?? "USD",
    monthlyBudget: row?.monthlyBudget ?? null,
  }
}

export async function updateUserSettings(
  currency: string,
  monthlyBudget?: string
): Promise<ActionResult> {
  const userId = await requireUserId()
  const parsed = parse(settingsSchema, { currency, monthlyBudget })
  if (!parsed.ok) return { ok: false, error: parsed.error }

  await db
    .insert(userSettings)
    .values({
      userId,
      currency: parsed.data.currency,
      monthlyBudget: parsed.data.monthlyBudget,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        currency: parsed.data.currency,
        monthlyBudget: parsed.data.monthlyBudget,
        updatedAt: new Date(),
      },
    })
  revalidatePath("/")
  revalidatePath("/entries")
  revalidatePath("/account")
  revalidatePath("/services")
  return { ok: true }
}

// ── Services / providers catalog ────────────────────────────────────────────

export type Service = {
  id: number
  name: string
  category: string
  billingUrl: string | null
  defaultAmount: string | null
  monthlyBudget: string | null
  isShared: boolean
  isActive: boolean
}

export type ServiceInput = {
  name: string
  category: string
  billingUrl?: string
  defaultAmount?: string
  monthlyBudget?: string
  isShared: boolean
  isActive: boolean
}

const serviceColumns = {
  id: services.id,
  name: services.name,
  category: services.category,
  billingUrl: services.billingUrl,
  defaultAmount: services.defaultAmount,
  monthlyBudget: services.monthlyBudget,
  isShared: services.isShared,
  isActive: services.isActive,
}

export async function getServices(): Promise<Service[]> {
  const userId = await requireUserId()
  return db
    .select(serviceColumns)
    .from(services)
    .where(eq(services.userId, userId))
    .orderBy(services.name)
}

export async function createService(input: ServiceInput): Promise<ActionResult> {
  const userId = await requireUserId()
  const parsed = parse(serviceSchema, input)
  if (!parsed.ok) return { ok: false, error: parsed.error }
  try {
    await db.insert(services).values({ userId, ...parsed.data })
  } catch (e) {
    if (isUniqueViolation(e))
      return { ok: false, error: "A service with this name already exists." }
    throw e
  }
  revalidatePath("/services")
  revalidatePath("/entries")
  return { ok: true }
}

export async function updateService(
  id: number,
  input: ServiceInput
): Promise<ActionResult> {
  const userId = await requireUserId()
  const parsed = parse(serviceSchema, input)
  if (!parsed.ok) return { ok: false, error: parsed.error }
  try {
    const updated = await db
      .update(services)
      .set(parsed.data)
      .where(and(eq(services.id, id), eq(services.userId, userId)))
      .returning({ id: services.id })
    if (updated.length === 0) return { ok: false, error: "Service not found." }
  } catch (e) {
    if (isUniqueViolation(e))
      return { ok: false, error: "A service with this name already exists." }
    throw e
  }
  revalidatePath("/services")
  revalidatePath("/entries")
  revalidatePath("/")
  return { ok: true }
}

export async function deleteService(id: number) {
  const userId = await requireUserId()
  await db
    .delete(services)
    .where(and(eq(services.id, id), eq(services.userId, userId)))
  revalidatePath("/services")
  revalidatePath("/entries")
  revalidatePath("/")
}

// ── Recurring cost templates ────────────────────────────────────────────────

export type Template = {
  id: number
  productId: number
  productName: string | null
  serviceId: number | null
  label: string
  amount: string
  isActive: boolean
}

export type TemplateInput = {
  productId: number
  serviceId?: number | null
  label: string
  amount: string
  isActive: boolean
}

export async function getTemplates(): Promise<Template[]> {
  const userId = await requireUserId()
  return db
    .select({
      id: costTemplates.id,
      productId: costTemplates.productId,
      productName: products.name,
      serviceId: costTemplates.serviceId,
      label: costTemplates.label,
      amount: costTemplates.amount,
      isActive: costTemplates.isActive,
    })
    .from(costTemplates)
    .innerJoin(products, eq(costTemplates.productId, products.id))
    .where(eq(products.userId, userId))
    .orderBy(products.name, costTemplates.label)
}

/** Active templates for a product, used to prefill a new monthly entry. */
export async function getTemplatesForProduct(
  productId: number
): Promise<{ serviceName: string; amount: string; serviceId: number | null }[]> {
  const userId = await requireUserId()
  const owned = await ownedProductIds(userId)
  if (!owned.includes(productId)) return []
  const rows = await db
    .select({
      serviceId: costTemplates.serviceId,
      label: costTemplates.label,
      amount: costTemplates.amount,
    })
    .from(costTemplates)
    .where(
      and(
        eq(costTemplates.productId, productId),
        eq(costTemplates.isActive, true)
      )
    )
    .orderBy(costTemplates.label)
  return rows.map((r) => ({
    serviceName: r.label,
    amount: r.amount,
    serviceId: r.serviceId,
  }))
}

export async function createTemplate(
  input: TemplateInput
): Promise<ActionResult> {
  const userId = await requireUserId()
  const parsed = parse(templateSchema, input)
  if (!parsed.ok) return { ok: false, error: parsed.error }
  const owned = await ownedProductIds(userId)
  if (!owned.includes(parsed.data.productId))
    return { ok: false, error: "Product not found." }
  const serviceId =
    parsed.data.serviceId &&
    (await ownedServiceIds(userId, [parsed.data.serviceId])).has(
      parsed.data.serviceId
    )
      ? parsed.data.serviceId
      : null

  await db.insert(costTemplates).values({
    userId,
    productId: parsed.data.productId,
    serviceId,
    label: parsed.data.label,
    amount: parsed.data.amount,
    isActive: parsed.data.isActive,
  })
  revalidatePath("/templates")
  return { ok: true }
}

export async function updateTemplate(
  id: number,
  input: TemplateInput
): Promise<ActionResult> {
  const userId = await requireUserId()
  const parsed = parse(templateSchema, input)
  if (!parsed.ok) return { ok: false, error: parsed.error }
  const owned = await ownedProductIds(userId)
  if (!owned.includes(parsed.data.productId))
    return { ok: false, error: "Product not found." }
  const serviceId =
    parsed.data.serviceId &&
    (await ownedServiceIds(userId, [parsed.data.serviceId])).has(
      parsed.data.serviceId
    )
      ? parsed.data.serviceId
      : null

  const updated = await db
    .update(costTemplates)
    .set({
      productId: parsed.data.productId,
      serviceId,
      label: parsed.data.label,
      amount: parsed.data.amount,
      isActive: parsed.data.isActive,
    })
    .where(and(eq(costTemplates.id, id), eq(costTemplates.userId, userId)))
    .returning({ id: costTemplates.id })
  if (updated.length === 0) return { ok: false, error: "Template not found." }
  revalidatePath("/templates")
  return { ok: true }
}

export async function deleteTemplate(id: number) {
  const userId = await requireUserId()
  await db
    .delete(costTemplates)
    .where(and(eq(costTemplates.id, id), eq(costTemplates.userId, userId)))
  revalidatePath("/templates")
}

// ── Copy previous month ─────────────────────────────────────────────────────

/** The most recent entry strictly before the target period, for prefill. */
export async function getPreviousEntryExpenses(
  productId: number,
  year: number,
  month: number
): Promise<{ serviceName: string; amount: string; serviceId: number | null }[]> {
  const userId = await requireUserId()
  const owned = await ownedProductIds(userId)
  if (!owned.includes(productId)) return []
  const target = year * 12 + (month - 1)
  const [prev] = await db
    .select({ id: monthlyRecords.id })
    .from(monthlyRecords)
    .where(
      and(
        eq(monthlyRecords.productId, productId),
        sql`${monthlyRecords.year} * 12 + (${monthlyRecords.month} - 1) < ${target}`
      )
    )
    .orderBy(desc(monthlyRecords.year), desc(monthlyRecords.month))
    .limit(1)
  if (!prev) return []
  const rows = await db
    .select({
      serviceName: expenses.serviceName,
      amount: expenses.amount,
      serviceId: expenses.serviceId,
    })
    .from(expenses)
    .where(eq(expenses.recordId, prev.id))
  return rows
}

// ── Shared-cost allocation ──────────────────────────────────────────────────

export type Allocation = { productId: number; weight: string | null }

export type SharedCost = {
  id: number
  serviceId: number | null
  label: string
  month: number
  year: number
  totalAmount: string
  method: AllocationMethod
  allocations: Allocation[]
}

export type SharedCostInput = {
  serviceId?: number | null
  label: string
  month: number
  year: number
  totalAmount: string
  method: AllocationMethod
  allocations: { productId: number; weight?: string }[]
}

export async function getSharedCosts(): Promise<SharedCost[]> {
  const userId = await requireUserId()
  const costs = await db
    .select()
    .from(sharedCosts)
    .where(eq(sharedCosts.userId, userId))
    .orderBy(desc(sharedCosts.year), desc(sharedCosts.month), sharedCosts.label)
  if (costs.length === 0) return []
  const allocs = await db
    .select()
    .from(sharedCostAllocations)
    .where(
      inArray(
        sharedCostAllocations.sharedCostId,
        costs.map((c) => c.id)
      )
    )
  const byCost = new Map<number, Allocation[]>()
  for (const a of allocs) {
    const list = byCost.get(a.sharedCostId) ?? []
    list.push({ productId: a.productId, weight: a.weight })
    byCost.set(a.sharedCostId, list)
  }
  return costs.map((c) => ({
    id: c.id,
    serviceId: c.serviceId,
    label: c.label,
    month: c.month,
    year: c.year,
    totalAmount: c.totalAmount,
    method: c.method as AllocationMethod,
    allocations: byCost.get(c.id) ?? [],
  }))
}

async function validateSharedCostInput(userId: string, input: SharedCostInput) {
  const parsed = parse(sharedCostSchema, input)
  if (!parsed.ok) return { ok: false as const, error: parsed.error }
  const owned = new Set(await ownedProductIds(userId))
  if (parsed.data.allocations.some((a) => !owned.has(a.productId)))
    return { ok: false as const, error: "Unknown product in allocation." }
  const serviceId =
    parsed.data.serviceId &&
    (await ownedServiceIds(userId, [parsed.data.serviceId])).has(
      parsed.data.serviceId
    )
      ? parsed.data.serviceId
      : null
  return { ok: true as const, data: parsed.data, serviceId }
}

export async function createSharedCost(
  input: SharedCostInput
): Promise<ActionResult> {
  const userId = await requireUserId()
  const prep = await validateSharedCostInput(userId, input)
  if (!prep.ok) return { ok: false, error: prep.error }
  const { data, serviceId } = prep

  const values = data.allocations.map(
    (a) => sql`(${a.productId}::integer, ${a.weight}::numeric)`
  )
  await db.execute(sql`
    WITH sc AS (
      INSERT INTO shared_costs (user_id, service_id, label, month, year, total_amount, method)
      VALUES (${userId}, ${serviceId}, ${data.label}, ${data.month}, ${data.year}, ${data.totalAmount}::numeric, ${data.method})
      RETURNING id
    )
    INSERT INTO shared_cost_allocations (shared_cost_id, product_id, weight)
    SELECT sc.id, v.product_id, v.weight
    FROM sc, (VALUES ${sql.join(values, sql`, `)}) AS v(product_id, weight)
  `)
  revalidatePath("/shared-costs")
  revalidatePath("/")
  return { ok: true }
}

export async function updateSharedCost(
  id: number,
  input: SharedCostInput
): Promise<ActionResult> {
  const userId = await requireUserId()
  const prep = await validateSharedCostInput(userId, input)
  if (!prep.ok) return { ok: false, error: prep.error }
  const { data, serviceId } = prep

  const [owned] = await db
    .select({ id: sharedCosts.id })
    .from(sharedCosts)
    .where(and(eq(sharedCosts.id, id), eq(sharedCosts.userId, userId)))
  if (!owned) return { ok: false, error: "Shared cost not found." }

  const updateQ = db
    .update(sharedCosts)
    .set({
      serviceId,
      label: data.label,
      month: data.month,
      year: data.year,
      totalAmount: data.totalAmount,
      method: data.method,
    })
    .where(and(eq(sharedCosts.id, id), eq(sharedCosts.userId, userId)))
  const deleteQ = db
    .delete(sharedCostAllocations)
    .where(eq(sharedCostAllocations.sharedCostId, id))
  const insertQ = db.insert(sharedCostAllocations).values(
    data.allocations.map((a) => ({
      sharedCostId: id,
      productId: a.productId,
      weight: a.weight ?? null,
    }))
  )
  await db.batch([updateQ, deleteQ, insertQ])
  revalidatePath("/shared-costs")
  revalidatePath("/")
  return { ok: true }
}

export async function deleteSharedCost(id: number) {
  const userId = await requireUserId()
  await db
    .delete(sharedCosts)
    .where(and(eq(sharedCosts.id, id), eq(sharedCosts.userId, userId)))
  revalidatePath("/shared-costs")
  revalidatePath("/")
}

/** Per product/period allocated amount derived from shared costs. */
export type AllocatedCost = {
  productId: number
  year: number
  month: number
  amount: number
}

export async function getAllocatedCosts(): Promise<AllocatedCost[]> {
  const userId = await requireUserId()
  const costs = await db
    .select()
    .from(sharedCosts)
    .where(eq(sharedCosts.userId, userId))
  if (costs.length === 0) return []
  const allocs = await db
    .select()
    .from(sharedCostAllocations)
    .where(
      inArray(
        sharedCostAllocations.sharedCostId,
        costs.map((c) => c.id)
      )
    )
  const byCost = new Map<number, typeof allocs>()
  for (const a of allocs) {
    const list = byCost.get(a.sharedCostId) ?? []
    list.push(a)
    byCost.set(a.sharedCostId, list)
  }
  const out: AllocatedCost[] = []
  for (const c of costs) {
    const list = byCost.get(c.id) ?? []
    if (list.length === 0) continue
    const total = Number(c.totalAmount)
    for (const a of list) {
      let amount = 0
      if (c.method === "equal") amount = total / list.length
      else if (c.method === "percentage")
        amount = (total * Number(a.weight ?? 0)) / 100
      else amount = Number(a.weight ?? 0) // fixed
      out.push({
        productId: a.productId,
        year: c.year,
        month: c.month,
        amount: Math.round(amount * 100) / 100,
      })
    }
  }
  return out
}

// ── Insights / variance detection ───────────────────────────────────────────

export type Insight = {
  id: string
  severity: "warning" | "info"
  title: string
  detail: string
}

const pidx = (year: number, month: number) => year * 12 + (month - 1)
const pctChange = (cur: number, prev: number) =>
  prev === 0 ? null : ((cur - prev) / Math.abs(prev)) * 100

export async function getInsights(): Promise<Insight[]> {
  const userId = await requireUserId()
  const [dashRows, settings, productList, serviceList] = await Promise.all([
    getDashboardData(), // already includes allocated shared costs
    getUserSettings(),
    getProducts(),
    getServices(),
  ])

  const fmt = (v: number) => formatMoney(v, settings.currency, { compact: true })

  // Combined product cost per period (direct expenses + allocated shared cost).
  const productCost = new Map<string, number>()
  const periods = new Set<number>()
  for (const r of dashRows) {
    const key = `${r.productId}:${pidx(r.year, r.month)}`
    productCost.set(key, (productCost.get(key) ?? 0) + r.cost)
    periods.add(pidx(r.year, r.month))
  }

  if (periods.size === 0) return []
  const anchor = Math.max(...periods)
  const prev = anchor - 1
  const anchorLabel = `${MONTH_ABBR[anchor % 12]} ${Math.floor(anchor / 12)}`

  const insights: Insight[] = []

  // Per-product cost variance (anchor vs previous month).
  for (const p of productList) {
    const cur = productCost.get(`${p.id}:${anchor}`)
    const before = productCost.get(`${p.id}:${prev}`)
    if (cur == null || before == null) continue
    const pct = pctChange(cur, before)
    if (pct == null || Math.abs(pct) < 15) continue
    const up = cur > before
    insights.push({
      id: `prodcost-${p.id}`,
      severity: up ? "warning" : "info",
      title: `${p.name} cost ${up ? "up" : "down"} ${Math.abs(pct).toFixed(0)}%`,
      detail: `${fmt(before)} → ${fmt(cur)} vs previous month.`,
    })
  }

  // Provider/service cost variance by service name.
  const providerRows = await db
    .select({
      serviceId: expenses.serviceId,
      serviceName: expenses.serviceName,
      year: monthlyRecords.year,
      month: monthlyRecords.month,
      amount: sql<string>`SUM(${expenses.amount})`,
    })
    .from(expenses)
    .innerJoin(monthlyRecords, eq(expenses.recordId, monthlyRecords.id))
    .innerJoin(products, eq(monthlyRecords.productId, products.id))
    .where(eq(products.userId, userId))
    .groupBy(
      expenses.serviceId,
      expenses.serviceName,
      monthlyRecords.year,
      monthlyRecords.month
    )

  const providerCur = new Map<string, number>()
  const providerPrev = new Map<string, number>()
  const serviceCur = new Map<number, number>()
  for (const r of providerRows) {
    const period = pidx(r.year, r.month)
    const amt = Number(r.amount)
    if (period === anchor) {
      providerCur.set(r.serviceName, (providerCur.get(r.serviceName) ?? 0) + amt)
      if (r.serviceId != null)
        serviceCur.set(r.serviceId, (serviceCur.get(r.serviceId) ?? 0) + amt)
    } else if (period === prev) {
      providerPrev.set(r.serviceName, (providerPrev.get(r.serviceName) ?? 0) + amt)
    }
  }
  for (const [name, cur] of providerCur) {
    const before = providerPrev.get(name)
    if (before == null) continue
    const pct = pctChange(cur, before)
    if (pct == null || Math.abs(pct) < 20) continue
    const up = cur > before
    insights.push({
      id: `provider-${name}`,
      severity: up ? "warning" : "info",
      title: `${name} ${up ? "up" : "down"} ${Math.abs(pct).toFixed(0)}%`,
      detail: `Provider cost ${fmt(before)} → ${fmt(cur)} month over month.`,
    })
  }

  // Missing entries: products tracked historically but absent at the anchor.
  for (const p of productList) {
    const hasAnchor = productCost.has(`${p.id}:${anchor}`)
    const hasHistory = [...periods].some(
      (pe) => pe < anchor && productCost.has(`${p.id}:${pe}`)
    )
    if (!hasAnchor && hasHistory) {
      insights.push({
        id: `missing-${p.id}`,
        severity: "warning",
        title: `No ${anchorLabel} entry for ${p.name}`,
        detail: `This product has prior entries but none recorded for ${anchorLabel}.`,
      })
    }
  }

  // Budget warnings (anchor month).
  for (const p of productList) {
    if (!p.monthlyBudget) continue
    const cur = productCost.get(`${p.id}:${anchor}`)
    if (cur == null) continue
    const budget = Number(p.monthlyBudget)
    if (cur > budget) {
      insights.push({
        id: `budget-prod-${p.id}`,
        severity: "warning",
        title: `${p.name} over budget`,
        detail: `${fmt(cur)} spent vs ${fmt(budget)} budget for ${anchorLabel}.`,
      })
    }
  }
  for (const s of serviceList) {
    if (!s.monthlyBudget) continue
    const cur = serviceCur.get(s.id)
    if (cur == null) continue
    const budget = Number(s.monthlyBudget)
    if (cur > budget) {
      insights.push({
        id: `budget-svc-${s.id}`,
        severity: "warning",
        title: `${s.name} over budget`,
        detail: `${fmt(cur)} spent vs ${fmt(budget)} budget for ${anchorLabel}.`,
      })
    }
  }
  if (settings.monthlyBudget) {
    let totalAnchor = 0
    for (const [key, v] of productCost)
      if (key.endsWith(`:${anchor}`)) totalAnchor += v
    const budget = Number(settings.monthlyBudget)
    if (totalAnchor > budget) {
      insights.push({
        id: "budget-global",
        severity: "warning",
        title: "Total spend over budget",
        detail: `${fmt(totalAnchor)} total vs ${fmt(budget)} budget for ${anchorLabel}.`,
      })
    }
  }

  // Warnings first, then info.
  return insights.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "warning" ? -1 : 1
  )
}

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

// ── Cost breakdown by service / category ────────────────────────────────────

export type BreakdownRow = { key: string; amount: number }
export type CostBreakdown = {
  byService: BreakdownRow[]
  byCategory: BreakdownRow[]
}

/** Provider/category cost breakdown for all entries (used on the dashboard). */
export async function getCostBreakdown(): Promise<CostBreakdown> {
  const userId = await requireUserId()
  const rows = await db
    .select({
      serviceName: expenses.serviceName,
      category: sql<string>`COALESCE(${services.category}, 'Uncategorized')`,
      amount: sql<string>`SUM(${expenses.amount})`,
    })
    .from(expenses)
    .innerJoin(monthlyRecords, eq(expenses.recordId, monthlyRecords.id))
    .innerJoin(products, eq(monthlyRecords.productId, products.id))
    .leftJoin(services, eq(expenses.serviceId, services.id))
    .where(eq(products.userId, userId))
    .groupBy(expenses.serviceName, services.category)

  const byService = new Map<string, number>()
  const byCategory = new Map<string, number>()
  for (const r of rows) {
    const amt = Number(r.amount)
    byService.set(r.serviceName, (byService.get(r.serviceName) ?? 0) + amt)
    byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + amt)
  }
  const toRows = (m: Map<string, number>) =>
    [...m.entries()]
      .map(([key, amount]) => ({ key, amount }))
      .sort((a, b) => b.amount - a.amount)
  return { byService: toRows(byService), byCategory: toRows(byCategory) }
}

// ── CSV export / import ─────────────────────────────────────────────────────

function csvCell(v: string | number | boolean | null | undefined): string {
  const s = v == null ? "" : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(
  headers: string[],
  rows: (string | number | boolean | null)[][]
): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")
}

export type ExportEntity =
  | "products"
  | "services"
  | "entries"
  | "expenses"
  | "templates"

export async function exportCsv(entity: ExportEntity): Promise<string> {
  const userId = await requireUserId()
  switch (entity) {
    case "products": {
      const rows = await getProducts()
      return toCsv(
        ["name", "description", "monthlyBudget"],
        rows.map((p) => [p.name, p.description ?? "", p.monthlyBudget ?? ""])
      )
    }
    case "services": {
      const rows = await getServices()
      return toCsv(
        [
          "name",
          "category",
          "billingUrl",
          "defaultAmount",
          "monthlyBudget",
          "isShared",
          "isActive",
        ],
        rows.map((s) => [
          s.name,
          s.category,
          s.billingUrl ?? "",
          s.defaultAmount ?? "",
          s.monthlyBudget ?? "",
          s.isShared,
          s.isActive,
        ])
      )
    }
    case "entries": {
      const rows = await getMonthlyRecords()
      return toCsv(
        ["product", "year", "month", "totalRevenue", "note"],
        rows.map((r) => [
          r.productName ?? "",
          r.year,
          r.month,
          r.totalRevenue,
          r.note ?? "",
        ])
      )
    }
    case "expenses": {
      const rows = await db
        .select({
          product: products.name,
          year: monthlyRecords.year,
          month: monthlyRecords.month,
          serviceName: expenses.serviceName,
          amount: expenses.amount,
          category: services.category,
        })
        .from(expenses)
        .innerJoin(monthlyRecords, eq(expenses.recordId, monthlyRecords.id))
        .innerJoin(products, eq(monthlyRecords.productId, products.id))
        .leftJoin(services, eq(expenses.serviceId, services.id))
        .where(eq(products.userId, userId))
        .orderBy(desc(monthlyRecords.year), desc(monthlyRecords.month))
      return toCsv(
        ["product", "year", "month", "serviceName", "amount", "category"],
        rows.map((r) => [
          r.product,
          r.year,
          r.month,
          r.serviceName,
          r.amount,
          r.category ?? "",
        ])
      )
    }
    case "templates": {
      const rows = await getTemplates()
      return toCsv(
        ["product", "label", "amount", "isActive"],
        rows.map((t) => [t.productName ?? "", t.label, t.amount, t.isActive])
      )
    }
  }
}

export type ImportRow = {
  product: string
  year: string
  month: string
  serviceName?: string
  amount?: string
  revenue?: string
}

export type ImportPreviewRow = {
  product: string
  year: number
  month: number
  revenue: string
  expenseCount: number
  status: "create" | "update" | "error"
  message?: string
}

export type ImportResult = {
  ok: boolean
  groups: ImportPreviewRow[]
  errors: string[]
  imported?: number
}

const MONEY_RE = /^\d+(\.\d{1,2})?$/

/**
 * Validate + (optionally) commit imported monthly entries/expenses. Rows are
 * grouped by product + period; each group becomes one entry whose expenses
 * fully replace any existing ones. `commit: false` returns a dry-run preview.
 */
export async function importEntries(
  rows: ImportRow[],
  commit: boolean
): Promise<ImportResult> {
  const userId = await requireUserId()
  const errors: string[] = []
  if (rows.length === 0) return { ok: false, groups: [], errors: ["No rows found."] }
  if (rows.length > 2000)
    return { ok: false, groups: [], errors: ["Too many rows (max 2000)."] }

  const productRows = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(eq(products.userId, userId))
  const byName = new Map(productRows.map((p) => [p.name.toLowerCase(), p.id]))

  const existing = await db
    .select({
      productId: monthlyRecords.productId,
      year: monthlyRecords.year,
      month: monthlyRecords.month,
    })
    .from(monthlyRecords)
    .innerJoin(products, eq(monthlyRecords.productId, products.id))
    .where(eq(products.userId, userId))
  const existingKeys = new Set(
    existing.map((e) => `${e.productId}:${e.year}:${e.month}`)
  )

  type Group = {
    productId: number
    product: string
    year: number
    month: number
    revenue: string | null
    items: { serviceName: string; amount: string }[]
    error?: string
  }
  const groups = new Map<string, Group>()
  const maxYear = new Date().getFullYear() + 1

  rows.forEach((row, i) => {
    const line = i + 1
    const name = (row.product ?? "").trim()
    const productId = byName.get(name.toLowerCase())
    const year = Number(row.year)
    const month = Number(row.month)

    let error: string | undefined
    if (!name) error = `Row ${line}: missing product.`
    else if (productId == null) error = `Row ${line}: unknown product "${name}".`
    else if (!Number.isInteger(year) || year < 2000 || year > maxYear)
      error = `Row ${line}: invalid year.`
    else if (!Number.isInteger(month) || month < 1 || month > 12)
      error = `Row ${line}: invalid month.`

    const svc = (row.serviceName ?? "").trim()
    const amt = (row.amount ?? "").trim()
    if (!error && svc && !MONEY_RE.test(amt))
      error = `Row ${line}: invalid amount for "${svc}".`
    const rev = (row.revenue ?? "").trim()
    if (!error && rev && !MONEY_RE.test(rev))
      error = `Row ${line}: invalid revenue.`

    if (error) {
      errors.push(error)
      return
    }

    const key = `${productId}:${year}:${month}`
    let g = groups.get(key)
    if (!g) {
      g = { productId: productId!, product: name, year, month, revenue: null, items: [] }
      groups.set(key, g)
    }
    if (rev && g.revenue == null) g.revenue = Number(rev).toFixed(2)
    if (svc) g.items.push({ serviceName: svc, amount: Number(amt).toFixed(2) })
  })

  const preview: ImportPreviewRow[] = [...groups.values()].map((g) => ({
    product: g.product,
    year: g.year,
    month: g.month,
    revenue: g.revenue ?? "0.00",
    expenseCount: g.items.length,
    status: existingKeys.has(`${g.productId}:${g.year}:${g.month}`)
      ? "update"
      : "create",
  }))

  if (!commit || errors.length > 0) {
    return { ok: errors.length === 0, groups: preview, errors }
  }

  let imported = 0
  for (const g of groups.values()) {
    const revenue = g.revenue ?? "0.00"
    const [rec] = await db
      .insert(monthlyRecords)
      .values({ productId: g.productId, month: g.month, year: g.year, totalRevenue: revenue })
      .onConflictDoUpdate({
        target: [monthlyRecords.productId, monthlyRecords.month, monthlyRecords.year],
        set: { totalRevenue: revenue },
      })
      .returning({ id: monthlyRecords.id })

    const deleteQ = db.delete(expenses).where(eq(expenses.recordId, rec.id))
    if (g.items.length > 0) {
      const insertQ = db.insert(expenses).values(
        g.items.map((it) => ({
          recordId: rec.id,
          serviceName: it.serviceName,
          amount: it.amount,
        }))
      )
      await db.batch([deleteQ, insertQ])
    } else {
      await deleteQ
    }
    imported++
  }

  revalidatePath("/entries")
  revalidatePath("/")
  return { ok: true, groups: preview, errors, imported }
}
