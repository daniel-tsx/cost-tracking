import { getProducts, getUserSettings } from '@/app/actions'
import { ProductsTable } from '@/components/products-table'
import { AddProductDialog } from '@/components/add-product-dialog'
import { EmptyState } from '@/components/empty-state'
import { PackageIcon } from '@hugeicons/core-free-icons'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const [products, settings] = await Promise.all([
    getProducts(),
    getUserSettings(),
  ])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Manage
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Products</h1>
        </div>
        <AddProductDialog />
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="No products yet"
          description="Add your first product to start tracking its costs and revenue."
          action={<AddProductDialog />}
        />
      ) : (
        <ProductsTable products={products} currency={settings.currency} />
      )}
    </div>
  )
}
