"use client"

export const dynamic = "force-dynamic"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"

function LoginContent() {
  const router = useRouter()
  const search = useSearchParams()

  useEffect(() => {
    const verified = search?.get("verified")
    const target = verified === "true" ? "/auth/signin?verified=true" : "/auth/signin"
    router.replace(target)
  }, [router, search])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-300">Redirecting to sign in...</p>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BouncingBallsLoader 
          size="lg" 
          color="#FFD700"
          showText={true}
          text="Loading..."
        />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
} 