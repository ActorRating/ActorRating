"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Legacy OAuth callback path. Authentication is email/password only;
 * this page sends users home to avoid dead ends from old bookmarks.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/")
  }, [router])
  return null
}
