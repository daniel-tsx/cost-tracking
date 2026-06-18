import {
  getTemplates,
  getProducts,
  getServices,
  getUserSettings,
} from '@/app/actions'
import { TemplatesManager } from '@/components/templates-manager'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const [templates, products, allServices, settings] = await Promise.all([
    getTemplates(),
    getProducts(),
    getServices(),
    getUserSettings(),
  ])
  const services = allServices
    .filter((s) => s.isActive)
    .map((s) => ({ id: s.id, name: s.name, defaultAmount: s.defaultAmount }))

  return (
    <div className="space-y-8">
      <TemplatesManager
        templates={templates}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        services={services}
        currency={settings.currency}
      />
    </div>
  )
}
