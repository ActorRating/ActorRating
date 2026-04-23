"use client"

import { useSession } from "@/components/providers/SessionProvider"
import { useState, useEffect } from "react"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * Pure loading-screen wrapper.
 *
 * Routing is NOT this component's responsibility:
 *   - Unauthenticated access is blocked by middleware (auth.config.ts PROTECTED list).
 *   - Onboarding redirects are computed in server components (dashboard/page.tsx).
 *
 * Client components must NOT control authentication-based routing or access control.
 *
 * This component only prevents a flash of un-initialized UI by rendering a
 * spinner until the client-side session has resolved.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { loading, isInitialized } = useSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isInitialized || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BouncingBallsLoader
            size="md"
            color="#FFD700"
            showText={true}
            text="Loading..."
          />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
