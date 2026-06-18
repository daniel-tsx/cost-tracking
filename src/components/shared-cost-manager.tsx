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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  Edit01Icon,
  Delete02Icon,
  DistributionIcon,
} from '@hugeicons/core-free-icons'
import {
  createSharedCost,
  updateSharedCost,
  deleteSharedCost,
  type SharedCost,
  type SharedCostInput,
} from '@/app/actions'
import { ALLOCATION_METHODS, type AllocationMethod } from '@/lib/validation'
import { formatMoney, type Currency } from '@/lib/currency'
import { cn } from '@/lib/utils'

type Product = { id: number; name: string }
type ServiceOpt = { id: number; name: string }

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 4 + i)

const METHOD_LABELS: Record<AllocationMethod, string> = {
  equal: 'Split equally',
  percentage: 'By percentage',
  fixed: 'Fixed amount',
}

export function SharedCostManager({
  sharedCosts,
  products,
  services,
  currency,
}: {
  sharedCosts: SharedCost[]
  products: Product[]
  services: ServiceOpt[]
  currency: Currency
}) {
  const router = useRouter()
  const [dialog, setDialog] = useState<{ cost?: SharedCost } | null>(null)
  const [deleting, setDeleting] = useState<SharedCost | null>(null)
  const [pendingDelete, setPendingDelete] = useState(false)

  const handleDelete = async () => {
    if (!deleting) return
    setPendingDelete(true)
    await deleteSharedCost(deleting.id)
    setPendingDelete(false)
    setDeleting(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Allocation
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Shared costs</h1>
        </div>
        {products.length > 0 && (
          <Button onClick={() => setDialog({})}>
            <HugeiconsIcon icon={Add01Icon} className="mr-2 size-4" />
            Add shared cost
          </Button>
        )}
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={DistributionIcon}
          title="No products yet"
          description="Add products first, then split shared services across them."
        />
      ) : sharedCosts.length === 0 ? (
        <EmptyState
          icon={DistributionIcon}
          title="No shared costs yet"
          description="Split a shared service (e.g. a database plan) across products. Allocated amounts roll into each product's monthly totals."
          action={
            <Button onClick={() => setDialog({})}>
              <HugeiconsIcon icon={Add01Icon} className="mr-2 size-4" />
              Add shared cost
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 text-xs uppercase tracking-wider text-muted-foreground">
                  Cost
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Period
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Method
                </TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground">
                  Total
                </TableHead>
                <TableHead className="w-[88px] pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sharedCosts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-6">
                    <span className="font-medium">{c.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {c.allocations.length} product
                      {c.allocations.length === 1 ? '' : 's'}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {MONTHS_SHORT[c.month - 1]} {c.year}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {METHOD_LABELS[c.method]}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(Number(c.totalAmount), currency)}
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit shared cost"
                        onClick={() => setDialog({ cost: c })}
                      >
                        <HugeiconsIcon icon={Edit01Icon} className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete shared cost"
                        onClick={() => setDeleting(c)}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SharedCostDialog
        key={dialog?.cost?.id ?? 'new'}
        open={!!dialog}
        cost={dialog?.cost}
        products={products}
        services={services}
        currency={currency}
        onOpenChange={(o) => {
          if (!o) setDialog(null)
        }}
        onSaved={() => {
          setDialog(null)
          router.refresh()
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => {
          if (!o) setDeleting(null)
        }}
        title="Delete this shared cost?"
        description="This removes the shared cost and its allocations. This cannot be undone."
        pending={pendingDelete}
        onConfirm={handleDelete}
      />
    </>
  )
}

type AllocRow = { productId: number; name: string; included: boolean; weight: string }

function SharedCostDialog({
  open,
  cost,
  products,
  services,
  currency,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  cost?: SharedCost
  products: Product[]
  services: ServiceOpt[]
  currency: Currency
  onOpenChange: (o: boolean) => void
  onSaved: () => void
}) {
  const [label, setLabel] = useState(cost?.label ?? '')
  const [serviceId, setServiceId] = useState(
    cost?.serviceId ? String(cost.serviceId) : ''
  )
  const [month, setMonth] = useState(String(cost?.month ?? new Date().getMonth() + 1))
  const [year, setYear] = useState(String(cost?.year ?? currentYear))
  const [total, setTotal] = useState(cost?.totalAmount ?? '')
  const [method, setMethod] = useState<AllocationMethod>(cost?.method ?? 'equal')
  const [rows, setRows] = useState<AllocRow[]>(() =>
    products.map((p) => {
      const a = cost?.allocations.find((x) => x.productId === p.id)
      return {
        productId: p.id,
        name: p.name,
        included: !!a,
        weight: a?.weight ?? '',
      }
    })
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const included = rows.filter((r) => r.included)
  const totalNum = Number(total) || 0

  const previewAmount = (r: AllocRow): number => {
    if (!r.included) return 0
    if (method === 'equal') return included.length ? totalNum / included.length : 0
    if (method === 'percentage') return (totalNum * (Number(r.weight) || 0)) / 100
    return Number(r.weight) || 0
  }

  const setRow = (productId: number, patch: Partial<AllocRow>) =>
    setRows((prev) =>
      prev.map((r) => (r.productId === productId ? { ...r, ...patch } : r))
    )

  const onPickService = (sid: string | null) => {
    setServiceId(sid ?? '')
    const svc = services.find((s) => String(s.id) === sid)
    if (svc) setLabel(svc.name)
  }

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    const input: SharedCostInput = {
      serviceId: serviceId ? Number(serviceId) : null,
      label: label.trim(),
      month: Number(month),
      year: Number(year),
      totalAmount: total,
      method,
      allocations: included.map((r) => ({
        productId: r.productId,
        weight: method === 'equal' ? undefined : r.weight || '0',
      })),
    }
    const res = cost
      ? await updateSharedCost(cost.id, input)
      : await createSharedCost(input)
    setSaving(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <HugeiconsIcon icon={DistributionIcon} className="size-5 text-primary" />
            </div>
            <DialogTitle>{cost ? 'Edit shared cost' : 'Add shared cost'}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {services.length > 0 && (
            <div className="space-y-2">
              <Label>Service (optional)</Label>
              <Select value={serviceId} onValueChange={onPickService}>
                <SelectTrigger className="w-full">
                  {serviceId
                    ? services.find((s) => String(s.id) === serviceId)?.name
                    : 'Custom / none'}
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="sc-label">Label</Label>
            <Input
              id="sc-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Shared database plan"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={month} onValueChange={(v) => setMonth(v ?? '')}>
                <SelectTrigger className="w-full">
                  {MONTHS[Number(month) - 1]}
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={year} onValueChange={(v) => setYear(v ?? '')}>
                <SelectTrigger className="w-full">{year}</SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sc-total">Total</Label>
              <Input
                id="sc-total"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Allocation method</Label>
            <Select
              value={method}
              onValueChange={(v) => setMethod((v as AllocationMethod) ?? 'equal')}
            >
              <SelectTrigger className="w-full">{METHOD_LABELS[method]}</SelectTrigger>
              <SelectContent>
                {ALLOCATION_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Products</Label>
            <div className="space-y-1.5">
              {rows.map((r) => (
                <div
                  key={r.productId}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={r.included}
                    onClick={() => setRow(r.productId, { included: !r.included })}
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded border',
                      r.included
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border'
                    )}
                  >
                    {r.included && '✓'}
                  </button>
                  <span className="flex-1 truncate text-sm">{r.name}</span>
                  {r.included && method !== 'equal' && (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      value={r.weight}
                      onChange={(e) =>
                        setRow(r.productId, { weight: e.target.value })
                      }
                      placeholder={method === 'percentage' ? '%' : 'amount'}
                      className="h-8 w-24"
                    />
                  )}
                  {r.included && (
                    <span className="w-20 text-right text-xs tabular-nums text-muted-foreground">
                      {formatMoney(previewAmount(r), currency)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {method === 'percentage' && (
              <p className="text-xs text-muted-foreground">
                Percentages should add up to 100%.
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving || !label.trim() || !total.trim() || included.length === 0
              }
            >
              {saving ? 'Saving…' : cost ? 'Save changes' : 'Add shared cost'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
