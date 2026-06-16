'use client'

import { useState } from 'react'
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
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Delete02Icon,
  Edit01Icon,
  PackageIcon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons'
import { EntryDialog } from '@/components/entry-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { deleteMonthlyRecord, type MonthlyRecord } from '@/app/actions'
import { cn } from '@/lib/utils'

type Product = { id: number; name: string }

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const fmtMoney = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)

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

export function EntriesList({
  records,
  products,
}: {
  records: MonthlyRecord[]
  products: Product[]
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<MonthlyRecord | null>(null)
  const [deleting, setDeleting] = useState<MonthlyRecord | null>(null)
  const [pendingDelete, setPendingDelete] = useState(false)

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
            {records.map((r) => {
              const t = totals(r)
              const isOpen = expanded.has(r.id)
              return (
                <EntryRows
                  key={r.id}
                  record={r}
                  totals={t}
                  isOpen={isOpen}
                  onToggle={() => toggle(r.id)}
                  onEdit={() => setEditing(r)}
                  onDelete={() => setDeleting(r)}
                />
              )
            })}
          </TableBody>
        </Table>
      </div>

      <EntryDialog
        products={products}
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

function EntryRows({
  record,
  totals: t,
  isOpen,
  onToggle,
  onEdit,
  onDelete,
}: {
  record: MonthlyRecord
  totals: ReturnType<typeof totals>
  isOpen: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
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
        <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
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
