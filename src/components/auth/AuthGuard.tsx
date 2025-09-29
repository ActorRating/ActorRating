"use client"

import { useSession } from "@/components/providers/SessionProvider"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

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

  useEffect(() => {
    if (!isInitialized || loading) return

    if (requireAuth && !user) {
      router.push(redirectTo)
    } else if (!requireAuth && user && pathname?.startsWith('/auth/')) {
      router.push('/dashboard')
    }
  }, [user, loading, isInitialized, requireAuth, redirectTo, router, pathname])

  // Show loading state while session is being initialized
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Loading...</h1>
          <p className="text-muted-foreground">Please wait while we verify your session.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
