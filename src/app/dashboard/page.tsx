import { redirect } from 'next/navigation'
import { getServerUserId } from '@/lib/serverAuth'
import { getDashboardData } from '@/lib/dashboardData'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const userId = await getServerUserId()
  if (!userId) {
    redirect('/auth/signin')
  }
  const { ratings, popularActors } = await getDashboardData(userId)
  if (ratings.length === 0) {
    redirect('/onboarding/rate')
  }
  return (
    <DashboardClient
      initialRatings={ratings}
      initialPopularActors={popularActors}
    />
  )
}
