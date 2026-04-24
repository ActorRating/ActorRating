import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getDashboardData } from '@/lib/dashboardData'
import { auth } from '@/auth'
import { resolveUser } from '@/lib/auth/resolveUser'
import DashboardClient from './DashboardClient'
import { Button } from '@/components/ui/Button'

// User-specific data — must remain dynamic
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/** Shown when dashboard data fails (e.g. Prisma/DB unavailable). Avoids generic error boundary. */
function DashboardDataUnavailable({ digest }: { digest?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center">
          <span className="text-xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-dm-serif-display)' }}>
          Couldn’t load your dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          We couldn’t connect to the database. This usually means <strong>DATABASE_URL</strong> in your
          deployment is missing or points to the wrong PostgreSQL instance. Set <strong>DATABASE_URL</strong>
          to your Prisma-managed PostgreSQL connection string and redeploy.
        </p>
        {digest ? (
          <p className="text-xs text-muted-foreground font-mono">Ref: {digest}</p>
        ) : null}
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" asChild>
            <a href="/dashboard">Try again</a>
          </Button>
          <Link href="/">
            <Button>Go home</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const session = await auth()
  const result = await resolveUser(session)

  // Middleware enforces authentication. A safety valve: if somehow an
  // unauthenticated request slips through, send to sign-in (never onboarding).
  if (result.status !== "authenticated") {
    redirect('/auth/signin')
  }
  // Only authenticated users who haven't finished onboarding go to onboarding.
  if (result.needsOnboarding) {
    redirect('/onboarding')
  }

  let ratings: Awaited<ReturnType<typeof getDashboardData>>['ratings']
  let popularActors: Awaited<ReturnType<typeof getDashboardData>>['popularActors']
  try {
    const data = await getDashboardData(result.user.id)
    ratings = data.ratings
    popularActors = data.popularActors
  } catch (err) {
    console.error('Dashboard getDashboardData failed:', err)
    const digest = err instanceof Error && 'digest' in err ? String((err as Error & { digest?: string }).digest) : undefined
    return <DashboardDataUnavailable digest={digest} />
  }
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
