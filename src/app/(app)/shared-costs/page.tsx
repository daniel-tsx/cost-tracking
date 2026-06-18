import {
  getSharedCosts,
  getProducts,
  getServices,
  getUserSettings,
} from '@/app/actions'
import { SharedCostManager } from '@/components/shared-cost-manager'

export const dynamic = 'force-dynamic'

export default async function SharedCostsPage() {
  const [sharedCosts, products, allServices, settings] = await Promise.all([
    getSharedCosts(),
    getProducts(),
    getServices(),
    getUserSettings(),
  ])
  // Shared services are the natural source, but any service can back a shared cost.
  const services = allServices.map((s) => ({ id: s.id, name: s.name }))

  return (
    <div className="space-y-8">
      <SharedCostManager
        sharedCosts={sharedCosts}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        services={services}
        currency={settings.currency}
      />
    </div>
  )
}
