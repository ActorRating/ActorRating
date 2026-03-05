import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerUserId } from '@/lib/serverAuth'
import { getDashboardData } from '@/lib/dashboardData'
import DashboardClient from './DashboardClient'
import { Button } from '@/components/ui/Button'

// User-specific data — must remain dynamic
export const dynamic = 'force-dynamic'

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
          deployment doesn’t match your Supabase Postgres. In Supabase Dashboard → Settings → Database, use
          the <strong>Connection pooling</strong> string (Transaction mode, port <strong>6543</strong>) and
          set it as <strong>DATABASE_URL</strong> in Vercel.
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
  const userId = await getServerUserId()
  if (!userId) {
    redirect('/auth/signin')
  }
  let ratings: Awaited<ReturnType<typeof getDashboardData>>['ratings']
  let popularActors: Awaited<ReturnType<typeof getDashboardData>>['popularActors']
  try {
    const data = await getDashboardData(userId)
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
