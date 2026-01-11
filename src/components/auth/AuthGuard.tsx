"use client"

import { useSession } from "@/components/providers/SessionProvider"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  requireAuth = false, 
  redirectTo = "/auth/signin" 
}: AuthGuardProps) {
  const { user, loading, isInitialized } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isInitialized || loading) return

    if (requireAuth && !user) {
      router.push(redirectTo)
    } else if (!requireAuth && user && pathname?.startsWith('/auth/')) {
      router.push('/dashboard')
    }
  }, [user, loading, isInitialized, requireAuth, redirectTo, router, pathname])

  // Show loading state while session is being initialized
  // Use mounted to prevent hydration mismatch
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
          <p className="text-muted-foreground mt-2">Please wait while we verify your session.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
