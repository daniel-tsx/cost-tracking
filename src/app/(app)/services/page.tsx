import { getServices, getUserSettings } from '@/app/actions'
import { ServicesManager } from '@/components/services-manager'

export const dynamic = 'force-dynamic'

export default async function ServicesPage() {
  const [services, settings] = await Promise.all([
    getServices(),
    getUserSettings(),
  ])

  return (
    <div className="space-y-8">
      <ServicesManager services={services} currency={settings.currency} />
    </div>
  )
}
