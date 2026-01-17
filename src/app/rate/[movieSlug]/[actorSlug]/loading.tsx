"use client"

import { SignedInLayout, HomeLayout } from '@/components/layout'
import { useUser } from '@/components/providers/SessionProvider'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'

export default function RatePageLoading() {
  const user = useUser()
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
