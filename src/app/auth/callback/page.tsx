"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Legacy callback path kept for old bookmarks.
 * Authentication now uses magic-link email only.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/")
  }, [router])
  return null
}
