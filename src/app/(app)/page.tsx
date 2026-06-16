import { getDashboardData } from '@/app/actions'
import { DashboardOverview } from '@/components/dashboard-overview'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const rows = await getDashboardData()
  return <DashboardOverview rows={rows} />
}
