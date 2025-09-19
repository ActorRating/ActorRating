"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function Login() {
  const router = useRouter()
  const search = useSearchParams()

  useEffect(() => {
    const verified = search.get("verified")
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