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
import { ToggleField } from '@/components/toggle-field'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  Edit01Icon,
  Delete02Icon,
  CloudServerIcon,
  LinkSquare02Icon,
} from '@hugeicons/core-free-icons'
import {
  createService,
  updateService,
  deleteService,
  type Service,
  type ServiceInput,
} from '@/app/actions'
import { SERVICE_CATEGORIES } from '@/lib/validation'
import { formatMoney, type Currency } from '@/lib/currency'

export function ServicesManager({
  services,
  currency,
}: {
  services: Service[]
  currency: Currency
}) {
  const router = useRouter()
  const [dialog, setDialog] = useState<{ service?: Service } | null>(null)
  const [deleting, setDeleting] = useState<Service | null>(null)
  const [pendingDelete, setPendingDelete] = useState(false)

  const handleDelete = async () => {
    if (!deleting) return
    setPendingDelete(true)
    await deleteService(deleting.id)
    setPendingDelete(false)
    setDeleting(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Catalog
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Services</h1>
        </div>
        <Button onClick={() => setDialog({})}>
          <HugeiconsIcon icon={Add01Icon} className="mr-2 size-4" />
          Add service
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
            <HugeiconsIcon
              icon={CloudServerIcon}
              className="size-6 text-muted-foreground"
            />
          </div>
          <h3 className="text-base font-medium">No services yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Catalog the providers you pay for (AI, hosting, database…) so costs
            can be tracked and budgeted across products.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 text-xs uppercase tracking-wider text-muted-foreground">
                  Service
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Category
                </TableHead>
                <TableHead className="hidden text-right text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">
                  Default
                </TableHead>
                <TableHead className="hidden text-right text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">
                  Budget
                </TableHead>
                <TableHead className="w-[88px] pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.id} className={s.isActive ? '' : 'opacity-55'}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <HugeiconsIcon
                          icon={CloudServerIcon}
                          className="size-4 text-primary"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.name}</span>
                          {s.isShared && (
                            <span className="rounded-full bg-chart-4/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-chart-4">
                              Shared
                            </span>
                          )}
                          {!s.isActive && (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Inactive
                            </span>
                          )}
                        </div>
                        {s.billingUrl && (
                          <a
                            href={s.billingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                          >
                            <HugeiconsIcon
                              icon={LinkSquare02Icon}
                              className="size-3"
                            />
                            Billing
                          </a>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {s.category}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                    {s.defaultAmount ? formatMoney(Number(s.defaultAmount), currency) : '—'}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                    {s.monthlyBudget ? formatMoney(Number(s.monthlyBudget), currency) : '—'}
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${s.name}`}
                        onClick={() => setDialog({ service: s })}
                      >
                        <HugeiconsIcon icon={Edit01Icon} className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${s.name}`}
                        onClick={() => setDeleting(s)}
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

      <ServiceDialog
        key={dialog?.service?.id ?? 'new'}
        open={!!dialog}
        service={dialog?.service}
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
        title={`Delete ${deleting?.name ?? 'service'}?`}
        description="Existing expenses keep their name but lose the link to this service. This cannot be undone."
        pending={pendingDelete}
        onConfirm={handleDelete}
      />
    </>
  )
}

function ServiceDialog({
  open,
  service,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  service?: Service
  onOpenChange: (o: boolean) => void
  onSaved: () => void
}) {
  const [name, setName] = useState(service?.name ?? '')
  const [category, setCategory] = useState(service?.category ?? 'Other')
  const [billingUrl, setBillingUrl] = useState(service?.billingUrl ?? '')
  const [defaultAmount, setDefaultAmount] = useState(service?.defaultAmount ?? '')
  const [monthlyBudget, setMonthlyBudget] = useState(service?.monthlyBudget ?? '')
  const [isShared, setIsShared] = useState(service?.isShared ?? false)
  const [isActive, setIsActive] = useState(service?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    const input: ServiceInput = {
      name: name.trim(),
      category,
      billingUrl: billingUrl.trim() || undefined,
      defaultAmount: defaultAmount.trim() || undefined,
      monthlyBudget: monthlyBudget.trim() || undefined,
      isShared,
      isActive,
    }
    const res = service
      ? await updateService(service.id, input)
      : await createService(input)
    setSaving(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <HugeiconsIcon icon={CloudServerIcon} className="size-5 text-primary" />
            </div>
            <DialogTitle>{service ? 'Edit service' : 'Add service'}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label htmlFor="svc-name">Name</Label>
            <Input
              id="svc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Neon, Vercel, OpenAI"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v ?? 'Other')}>
                <SelectTrigger className="w-full">{category}</SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-default">Default cost</Label>
              <Input
                id="svc-default"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={defaultAmount}
                onChange={(e) => setDefaultAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="svc-budget">Monthly budget</Label>
              <Input
                id="svc-budget"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-url">Billing URL</Label>
              <Input
                id="svc-url"
                value={billingUrl}
                onChange={(e) => setBillingUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
          <ToggleField
            label="Shared service"
            description="Split across products via shared-cost allocation."
            checked={isShared}
            onChange={setIsShared}
          />
          <ToggleField
            label="Active"
            description="Inactive services are hidden from entry pickers."
            checked={isActive}
            onChange={setIsActive}
          />

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : service ? 'Save changes' : 'Add service'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
