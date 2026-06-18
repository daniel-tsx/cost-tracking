import { z } from "zod"

/**
 * Shared server-side validation. Server actions are a public boundary — every
 * action must validate its input here rather than trusting the client form.
 */

export const CURRENCIES = ["USD", "VND", "EUR"] as const
export type Currency = (typeof CURRENCIES)[number]

export const SERVICE_CATEGORIES = [
  "AI",
  "Database",
  "Hosting",
  "Email",
  "Storage",
  "Analytics",
  "Domain",
  "Monitoring",
  "Other",
] as const
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]

export const ALLOCATION_METHODS = ["equal", "percentage", "fixed"] as const
export type AllocationMethod = (typeof ALLOCATION_METHODS)[number]

const MAX_MONEY = 1_000_000_000_000 // 1e12 — generous ceiling, blocks overflow

/** A money string like "12.50". Stored as a normalized 2-dp decimal string. */
const money = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v !== "", `${label} is required`)
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), `${label} must be a valid amount`)
    .refine((v) => Number(v) <= MAX_MONEY, `${label} is too large`)
    .transform((v) => Number(v).toFixed(2))

/** Optional money — empty/undefined/null becomes null. */
const optionalMoney = (label: string) =>
  z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v == null || v === "" ? null : v))
    .refine(
      (v) => v == null || /^\d+(\.\d{1,2})?$/.test(v),
      `${label} must be a valid amount`
    )
    .refine((v) => v == null || Number(v) <= MAX_MONEY, `${label} is too large`)
    .transform((v) => (v == null ? null : Number(v).toFixed(2)))

const name = (label: string, max = 120) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`)

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .nullish()
    .transform((v) => (v ? v : null))

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine(
    (v) => v == null || /^https?:\/\/.+/i.test(v),
    "Enter a valid URL starting with http(s)://"
  )

export const monthSchema = z
  .number()
  .int("Month must be a whole number")
  .min(1, "Month must be between 1 and 12")
  .max(12, "Month must be between 1 and 12")

const currentYear = () => new Date().getFullYear()
export const yearSchema = z
  .number()
  .int("Year must be a whole number")
  .min(2000, "Year must be 2000 or later")
  .max(currentYear() + 1, `Year must be ${currentYear() + 1} or earlier`)

export const idSchema = z.number().int().positive()

export const currencySchema = z.enum(CURRENCIES)
export const categorySchema = z.enum(SERVICE_CATEGORIES)

// ── Composite schemas ──────────────────────────────────────────────────────

export const productSchema = z.object({
  name: name("Product name"),
  description: optionalText(500),
  monthlyBudget: optionalMoney("Budget"),
})

export const expenseItemSchema = z.object({
  serviceName: name("Service name"),
  amount: money("Amount"),
  serviceId: idSchema.nullable().optional().default(null),
})

export const monthlyRecordSchema = z.object({
  productId: idSchema,
  month: monthSchema,
  year: yearSchema,
  totalRevenue: money("Revenue"),
  note: optionalText(1000),
  expenseItems: z.array(expenseItemSchema).max(100, "Too many cost items"),
})

export const serviceSchema = z.object({
  name: name("Service name"),
  category: categorySchema,
  billingUrl: optionalUrl,
  defaultAmount: optionalMoney("Default cost"),
  monthlyBudget: optionalMoney("Budget"),
  isShared: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

export const templateSchema = z.object({
  productId: idSchema,
  serviceId: idSchema.nullable().optional().default(null),
  label: name("Service name"),
  amount: money("Amount"),
  isActive: z.boolean().default(true),
})

export const allocationSchema = z.object({
  productId: idSchema,
  weight: optionalMoney("Weight"),
})

export const sharedCostSchema = z.object({
  serviceId: idSchema.nullable().optional().default(null),
  label: name("Service name"),
  month: monthSchema,
  year: yearSchema,
  totalAmount: money("Total amount"),
  method: z.enum(ALLOCATION_METHODS),
  allocations: z.array(allocationSchema).min(1, "Add at least one product"),
})

export const settingsSchema = z.object({
  currency: currencySchema,
  monthlyBudget: optionalMoney("Budget"),
})

// ── Helpers ────────────────────────────────────────────────────────────────

export type Parsed<T> = { ok: true; data: T } | { ok: false; error: string }

/** Parse with a schema, returning the first friendly error message on failure. */
export function parse<T>(schema: z.ZodType<T>, input: unknown): Parsed<T> {
  const result = schema.safeParse(input)
  if (result.success) return { ok: true, data: result.data }
  const first = result.error.issues[0]
  return { ok: false, error: first?.message ?? "Invalid input." }
}
