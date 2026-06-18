import {
  getDashboardData,
  getInsights,
  getCostBreakdown,
  getUserSettings,
} from '@/app/actions'
import { DashboardOverview } from '@/components/dashboard-overview'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [rows, insights, breakdown, settings] = await Promise.all([
    getDashboardData(),
    getInsights(),
    getCostBreakdown(),
    getUserSettings(),
  ])
  return (
    <DashboardOverview
      rows={rows}
      insights={insights}
      breakdown={breakdown}
      currency={settings.currency}
    />
  )
}
