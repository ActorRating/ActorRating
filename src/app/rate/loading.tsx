"use client"

import { SignedInLayout, HomeLayout } from '@/components/layout'
import { useSession } from '@/components/providers/SessionProvider'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'

export default function RatePageLoading() {
  const { user, loading: authLoading } = useSession()

  // While NextAuth resolves, user is null — don't pick Home vs Signed shell yet (logged-in flash).
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <BouncingBallsLoader
          size="lg"
          color="#FFD700"
          showText={true}
          text="Loading rating page..."
        />
      </div>
    )
  }

  const Layout = user ? SignedInLayout : HomeLayout

  return (
    <Layout>
      <div className="min-h-screen bg-black flex items-center justify-center">
        <BouncingBallsLoader
          size="lg"
          color="#FFD700"
          showText={true}
          text="Loading rating page..."
        />
      </div>
    </Layout>
  )
}
