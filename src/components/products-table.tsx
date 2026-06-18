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
import { Edit01Icon, Delete02Icon, PackageIcon } from '@hugeicons/core-free-icons'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { updateProduct, deleteProduct } from '@/app/actions'
import { formatMoney, type Currency } from '@/lib/currency'

type Product = {
  id: number
  name: string
  description: string | null
  monthlyBudget: string | null
}

export function ProductsTable({
  products,
  currency,
}: {
  products: Product[]
  currency: Currency
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<Product | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editBudget, setEditBudget] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [pendingDelete, setPendingDelete] = useState(false)

  const openEdit = (p: Product) => {
    setEditing(p)
    setEditName(p.name)
    setEditDesc(p.description ?? '')
    setEditBudget(p.monthlyBudget ?? '')
    setError(null)
  }

  const handleSave = async () => {
    if (!editing || !editName.trim()) return
    setError(null)
    setSaving(true)
    const res = await updateProduct(
      editing.id,
      editName.trim(),
      editDesc.trim(),
      editBudget.trim() || undefined
    )
    setSaving(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setEditing(null)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deleting) return
    setPendingDelete(true)
    await deleteProduct(deleting.id)
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
              <TableHead className="pl-6 text-xs uppercase tracking-wider text-muted-foreground">
                Product
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                Description
              </TableHead>
              <TableHead className="hidden text-right text-xs uppercase tracking-wider text-muted-foreground sm:table-cell">
                Budget
              </TableHead>
              <TableHead className="w-[88px] pr-6 text-right text-xs uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                      <HugeiconsIcon
                        icon={PackageIcon}
                        className="size-4 text-primary"
                      />
                    </div>
                    <span className="font-medium">{p.name}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {p.description || (
                    <span className="text-muted-foreground/50">No description</span>
                  )}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                  {p.monthlyBudget ? (
                    formatMoney(Number(p.monthlyBudget), currency)
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </TableCell>
                <TableCell className="pr-6">
                  <div className="flex justify-end gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${p.name}`}
                      onClick={() => openEdit(p)}
                    >
                      <HugeiconsIcon icon={Edit01Icon} className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => setDeleting(p)}
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

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-budget">Monthly cost budget</Label>
              <Input
                id="edit-budget"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={editBudget}
                onChange={(e) => setEditBudget(e.target.value)}
                placeholder="optional"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !editName.trim()}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={`Delete ${deleting?.name ?? 'product'}?`}
        description="This permanently removes the product and all of its monthly entries and costs. This cannot be undone."
        pending={pendingDelete}
        onConfirm={handleDelete}
      />
    </>
  )
}
