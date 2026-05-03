"use client"

import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'

export default function RatePageLoading() {
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
