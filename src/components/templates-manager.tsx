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
import { EmptyState } from '@/components/empty-state'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  Edit01Icon,
  Delete02Icon,
  RepeatIcon,
} from '@hugeicons/core-free-icons'
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type Template,
  type TemplateInput,
} from '@/app/actions'
import { formatMoney, type Currency } from '@/lib/currency'

type Product = { id: number; name: string }
type ServiceOpt = { id: number; name: string; defaultAmount: string | null }

export function TemplatesManager({
  templates,
  products,
  services,
  currency,
}: {
  templates: Template[]
  products: Product[]
  services: ServiceOpt[]
  currency: Currency
}) {
  const router = useRouter()
  const [dialog, setDialog] = useState<{ template?: Template } | null>(null)
  const [deleting, setDeleting] = useState<Template | null>(null)
  const [pendingDelete, setPendingDelete] = useState(false)

  const handleDelete = async () => {
    if (!deleting) return
    setPendingDelete(true)
    await deleteTemplate(deleting.id)
    setPendingDelete(false)
    setDeleting(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Recurring
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Templates</h1>
        </div>
        {products.length > 0 && (
          <Button onClick={() => setDialog({})}>
            <HugeiconsIcon icon={Add01Icon} className="mr-2 size-4" />
            Add template
          </Button>
        )}
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={RepeatIcon}
          title="No products yet"
          description="Add a product first, then define its recurring expected costs."
        />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={RepeatIcon}
          title="No templates yet"
          description="Define recurring expected costs per product to prefill new monthly entries in one click."
          action={
            <Button onClick={() => setDialog({})}>
              <HugeiconsIcon icon={Add01Icon} className="mr-2 size-4" />
              Add template
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 text-xs uppercase tracking-wider text-muted-foreground">
                  Product
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Service
                </TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground">
                  Amount
                </TableHead>
                <TableHead className="w-[88px] pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id} className={t.isActive ? '' : 'opacity-55'}>
                  <TableCell className="pl-6 font-medium">
                    {t.productName ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.label}
                    {!t.isActive && (
                      <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(Number(t.amount), currency)}
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit template"
                        onClick={() => setDialog({ template: t })}
                      >
                        <HugeiconsIcon icon={Edit01Icon} className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete template"
                        onClick={() => setDeleting(t)}
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

      <TemplateDialog
        key={dialog?.template?.id ?? 'new'}
        open={!!dialog}
        template={dialog?.template}
        products={products}
        services={services}
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
        title="Delete this template?"
        description="This removes the recurring template. Existing entries are unaffected."
        pending={pendingDelete}
        onConfirm={handleDelete}
      />
    </>
  )
}

function TemplateDialog({
  open,
  template,
  products,
  services,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  template?: Template
  products: Product[]
  services: ServiceOpt[]
  onOpenChange: (o: boolean) => void
  onSaved: () => void
}) {
  const [productId, setProductId] = useState(
    template ? String(template.productId) : ''
  )
  const [serviceId, setServiceId] = useState(
    template?.serviceId ? String(template.serviceId) : ''
  )
  const [label, setLabel] = useState(template?.label ?? '')
  const [amount, setAmount] = useState(template?.amount ?? '')
  const [isActive, setIsActive] = useState(template?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onPickService = (sid: string | null) => {
    setServiceId(sid ?? '')
    const svc = services.find((s) => String(s.id) === sid)
    if (svc) {
      setLabel(svc.name)
      if (!amount && svc.defaultAmount) setAmount(svc.defaultAmount)
    }
  }

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    const input: TemplateInput = {
      productId: Number(productId),
      serviceId: serviceId ? Number(serviceId) : null,
      label: label.trim(),
      amount,
      isActive,
    }
    const res = template
      ? await updateTemplate(template.id, input)
      : await createTemplate(input)
    setSaving(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <HugeiconsIcon icon={RepeatIcon} className="size-5 text-primary" />
            </div>
            <DialogTitle>{template ? 'Edit template' : 'Add template'}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={(v) => setProductId(v ?? '')}>
              <SelectTrigger className="w-full">
                {productId
                  ? products.find((p) => String(p.id) === productId)?.name
                  : 'Select product'}
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tpl-label">Service name</Label>
              <Input
                id="tpl-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Hosting"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-amount">Amount</Label>
              <Input
                id="tpl-amount"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <ToggleField
            label="Active"
            description="Only active templates prefill new entries."
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
            <Button
              onClick={handleSave}
              disabled={saving || !productId || !label.trim() || !amount.trim()}
            >
              {saving ? 'Saving…' : template ? 'Save changes' : 'Add template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
