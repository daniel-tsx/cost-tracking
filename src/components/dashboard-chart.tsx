'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatMoney, type Currency } from '@/lib/currency'

export type ChartPoint = {
  label: string
  revenue: number
  cost: number
  profit: number
  margin: number | null
}

const LOCALES: Record<Currency, string> = {
  USD: 'en-US',
  VND: 'vi-VN',
  EUR: 'de-DE',
}

const compactFmt = (v: number, currency: Currency) =>
  new Intl.NumberFormat(LOCALES[currency] ?? 'en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v)

const series: Record<string, { name: string; color: string }> = {
  revenue: { name: 'Revenue', color: 'var(--chart-3)' },
  cost: { name: 'Cost', color: 'var(--chart-2)' },
  profit: { name: 'Profit', color: 'var(--chart-1)' },
  margin: { name: 'Margin', color: 'var(--chart-5)' },
}

function CustomTooltip(props: Record<string, unknown> & { currency: Currency }) {
  const { active, payload, label, currency } = props
  if (!active || !Array.isArray(payload) || !payload.length) return null

  return (
    <div className="rounded-xl border border-border bg-popover px-3.5 py-3 shadow-lg">
      <p className="mb-2 font-mono text-xs text-muted-foreground">
        {label as string}
      </p>
      <div className="space-y-1.5">
        {(payload as Array<Record<string, unknown>>).map((entry, i) => {
          const key = entry.dataKey as string
          const value = Number(entry.value ?? 0)
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: entry.color as string }}
              />
              <span className="text-muted-foreground">{entry.name as string}</span>
              <span className="ml-auto pl-4 font-medium tabular-nums text-foreground">
                {key === 'margin'
                  ? `${value.toFixed(1)}%`
                  : formatMoney(value, currency, { compact: true })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DashboardChart({
  data,
  currency,
}: {
  data: ChartPoint[]
  currency: Currency
}) {
  const tickStyle = {
    fill: 'var(--muted-foreground)',
    fontSize: 11,
    fontFamily: 'var(--font-jetbrains-mono)',
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 8, left: 4, bottom: 4 }}
        barGap={4}
        barCategoryGap="22%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={tickStyle}
          dy={8}
        />
        <YAxis
          yAxisId="money"
          axisLine={false}
          tickLine={false}
          tick={tickStyle}
          tickFormatter={(v) => compactFmt(v, currency)}
          width={56}
        />
        <YAxis
          yAxisId="pct"
          orientation="right"
          axisLine={false}
          tickLine={false}
          tick={tickStyle}
          tickFormatter={(v) => `${v}%`}
          width={44}
        />
        <Tooltip
          content={(props) => (
            <CustomTooltip
              {...(props as Record<string, unknown>)}
              currency={currency}
            />
          )}
          cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <Bar
          yAxisId="money"
          dataKey="revenue"
          name={series.revenue.name}
          fill={series.revenue.color}
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
        <Bar
          yAxisId="money"
          dataKey="cost"
          name={series.cost.name}
          fill={series.cost.color}
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
        <Bar
          yAxisId="money"
          dataKey="profit"
          name={series.profit.name}
          fill={series.profit.color}
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="margin"
          name={series.margin.name}
          stroke={series.margin.color}
          strokeWidth={2}
          dot={{ r: 2.5, fill: series.margin.color, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
