import { CURRENCIES, type Currency } from "@/lib/validation"

export { CURRENCIES, type Currency }

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: "US Dollar (USD)",
  VND: "Vietnamese Dong (VND)",
  EUR: "Euro (EUR)",
}

const LOCALES: Record<Currency, string> = {
  USD: "en-US",
  VND: "vi-VN",
  EUR: "de-DE",
}

/**
 * Format a number in the account's currency. VND has no minor unit, so it is
 * always whole; `compact` rounds other currencies to whole units (for KPIs).
 * No FX conversion happens — values are assumed to be in the chosen currency.
 */
export function formatMoney(
  value: number,
  currency: Currency = "USD",
  opts: { compact?: boolean } = {}
): string {
  const fractionDigits = currency === "VND" ? 0 : opts.compact ? 0 : 2
  return new Intl.NumberFormat(LOCALES[currency] ?? "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}
