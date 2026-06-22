'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Delete02Icon,
  Edit01Icon,
  PackageIcon,
  ArrowRight01Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons'
import { EntryDialog, type ServiceOption } from '@/components/entry-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { deleteMonthlyRecord, type MonthlyRecord } from '@/app/actions'
import { formatMoney, type Currency } from '@/lib/currency'
import { cn } from '@/lib/utils'

type Product = { id: number; name: string }

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function totals(r: MonthlyRecord) {
  const revenue = Number(r.totalRevenue)
  const cost = r.expenses.reduce((s, e) => s + Number(e.amount), 0)
  const profit = revenue - cost
  return {
    revenue,
    cost,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : null,
  }
}

const SORTS = {
  newest: { label: 'Newest first', fn: (a: MonthlyRecord, b: MonthlyRecord) => b.year - a.year || b.month - a.month },
  oldest: { label: 'Oldest first', fn: (a: MonthlyRecord, b: MonthlyRecord) => a.year - b.year || a.month - b.month },
  revenue: { label: 'Highest revenue', fn: (a: MonthlyRecord, b: MonthlyRecord) => totals(b).revenue - totals(a).revenue },
  profit: { label: 'Highest profit', fn: (a: MonthlyRecord, b: MonthlyRecord) => totals(b).profit - totals(a).profit },
} as const

type SortKey = keyof typeof SORTS

export function EntriesList({
  records,
  products,
  services,
  currency,
}: {
  records: MonthlyRecord[]
  products: Product[]
  services: ServiceOption[]
  currency: Currency
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<MonthlyRecord | null>(null)
  const [deleting, setDeleting] = useState<MonthlyRecord | null>(null)
  const [pendingDelete, setPendingDelete] = useState(false)

  const [query, setQuery] = useState('')
  const [productFilter, setProductFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [sort, setSort] = useState<SortKey>('newest')

  const years = useMemo(
    () => [...new Set(records.map((r) => r.year))].sort((a, b) => b - a),
    [records]
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return records
      .filter((r) => {
        if (productFilter !== 'all' && String(r.productId) !== productFilter)
          return false
        if (yearFilter !== 'all' && String(r.year) !== yearFilter) return false
        if (q && !(r.productName ?? '').toLowerCase().includes(q)) return false
        return true
      })
      .sort(SORTS[sort].fn)
  }, [records, query, productFilter, yearFilter, sort])

  const filtersActive =
    query.trim() !== '' || productFilter !== 'all' || yearFilter !== 'all'

  const clearFilters = () => {
    setQuery('')
    setProductFilter('all')
    setYearFilter('all')
  }

  // Totals for the *currently filtered* view — a scorecard that responds to
  // the filters above, so the table reads as an analysis, not just a list.
  const summary = useMemo(() => {
    let revenue = 0
    let cost = 0
    for (const r of visible) {
      revenue += Number(r.totalRevenue)
      cost += r.expenses.reduce((s, e) => s + Number(e.amount), 0)
    }
    const profit = revenue - cost
    return {
      revenue,
      cost,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : null,
    }
  }, [visible])
  const fmtCompact = (v: number) => formatMoney(v, currency, { compact: true })

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = async () => {
    if (!deleting) return
    setPendingDelete(true)
    await deleteMonthlyRecord(deleting.id)
    setPendingDelete(false)
    setDeleting(null)
    router.refresh()
  }

  return (
    <>
      <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product…"
            className="pl-9"
            aria-label="Search entries"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={productFilter} onValueChange={(v) => setProductFilter(v ?? 'all')}>
            <SelectTrigger aria-label="Filter by product">
              {productFilter === 'all'
                ? 'All products'
                : products.find((p) => String(p.id) === productFilter)?.name}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={(v) => setYearFilter(v ?? 'all')}>
            <SelectTrigger aria-label="Filter by year">
              {yearFilter === 'all' ? 'All years' : yearFilter}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort((v as SortKey) ?? 'newest')}>
            <SelectTrigger aria-label="Sort entries">
              {SORTS[sort].label}
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORTS) as SortKey[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {SORTS[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {visible.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">
              {visible.length}
            </span>{' '}
            {visible.length === 1 ? 'entry' : 'entries'}
            {filtersActive && ' matched'}
          </span>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <SummaryStat dot="bg-success" label="Revenue" value={fmtCompact(summary.revenue)} />
          <SummaryStat dot="bg-destructive" label="Costs" value={fmtCompact(summary.cost)} />
          <SummaryStat
            dot="bg-primary"
            label="Net"
            value={fmtCompact(summary.profit)}
            valueClass={summary.profit < 0 ? 'text-destructive' : undefined}
          />
          {summary.margin !== null && (
            <SummaryStat label="Margin" value={`${summary.margin.toFixed(1)}%`} />
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8 pl-6" />
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                Product
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                Period
              </TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground">
                Revenue
              </TableHead>
              <TableHead className="hidden text-right text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">
                Cost
              </TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground">
                Profit
              </TableHead>
              <TableHead className="hidden text-right text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">
                Margin
              </TableHead>
              <TableHead className="w-[88px] pr-6" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="py-14 text-center">
                  <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
                      <HugeiconsIcon
                        icon={Search01Icon}
                        className="size-5 text-muted-foreground"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No entries match the current filters.
                    </p>
                    {filtersActive && (
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              visible.map((r) => (
                <EntryRows
                  key={r.id}
                  record={r}
                  totals={totals(r)}
                  currency={currency}
                  isOpen={expanded.has(r.id)}
                  onToggle={() => toggle(r.id)}
                  onEdit={() => setEditing(r)}
                  onDelete={() => setDeleting(r)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      </div>

      <EntryDialog
        products={products}
        services={services}
        currency={currency}
        record={editing ?? undefined}
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete this entry?"
        description={
          deleting
            ? `This removes the ${MONTHS[deleting.month - 1]} ${deleting.year} entry for ${deleting.productName ?? 'this product'} and its cost items. This cannot be undone.`
            : undefined
        }
        pending={pendingDelete}
        onConfirm={handleDelete}
      />
    </>
  )
}

function SummaryStat({
  dot,
  label,
  value,
  valueClass,
}: {
  dot?: string
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {dot && <span className={cn('size-1.5 rounded-full', dot)} />}
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium tabular-nums', valueClass)}>{value}</span>
    </span>
  )
}

function EntryRows({
  record,
  totals: t,
  currency,
  isOpen,
  onToggle,
  onEdit,
  onDelete,
}: {
  record: MonthlyRecord
  totals: ReturnType<typeof totals>
  currency: Currency
  isOpen: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const fmtMoney = (v: number) => formatMoney(v, currency)
  return (
    <>
      <TableRow
        className="cursor-pointer"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <TableCell className="pl-6">
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className={cn(
              'size-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-90'
            )}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <HugeiconsIcon icon={PackageIcon} className="size-4 text-primary" />
            </div>
            <span className="font-medium">
              {record.productName ?? (
                <span className="text-muted-foreground/50">Unknown</span>
              )}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {MONTHS[record.month - 1]} {record.year}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {fmtMoney(t.revenue)}
        </TableCell>
        <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
          {fmtMoney(t.cost)}
        </TableCell>
        <TableCell
          className={cn(
            'text-right font-semibold tabular-nums',
            t.profit >= 0 ? 'text-foreground' : 'text-destructive'
          )}
        >
          {fmtMoney(t.profit)}
        </TableCell>
        <TableCell
          className={cn(
            'hidden text-right tabular-nums sm:table-cell',
            t.margin === null
              ? 'text-muted-foreground'
              : t.margin < 0
                ? 'text-destructive'
                : t.margin >= 20
                  ? 'text-success'
                  : 'text-muted-foreground'
          )}
        >
          {t.margin === null ? '—' : `${t.margin.toFixed(1)}%`}
        </TableCell>
        <TableCell className="pr-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-end gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit entry"
              onClick={onEdit}
            >
              <HugeiconsIcon icon={Edit01Icon} className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete entry"
              onClick={onDelete}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={8} className="p-0">
            <div className="border-t border-border bg-muted/30 px-6 py-4">
              {record.note && (
                <p className="mb-3 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                  {record.note}
                </p>
              )}
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Cost breakdown
              </p>
              {record.expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No costs recorded for this entry.
                </p>
              ) : (
                <div className="max-w-md space-y-2">
                  {record.expenses.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{e.serviceName}</span>
                      <span className="tabular-nums">
                        {fmtMoney(Number(e.amount))}
                      </span>
                    </div>
                  ))}
                  <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-sm font-medium">
                    <span>Total cost</span>
                    <span className="tabular-nums">{fmtMoney(t.cost)}</span>
                  </div>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
