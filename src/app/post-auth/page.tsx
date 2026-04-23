"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

/**
 * Post-authentication routing gate.
 *
 * This MUST be a client component. The server-component equivalent called auth()
 * synchronously on the first render — but after an OAuth callback the session cookie
 * may not yet be present in the initial request, causing a premature "unauthenticated"
 * decision and a signin ↔ post-auth redirect loop.
 *
 * useSession() waits for the Next-Auth client to fully hydrate the session from the
 * cookie before we evaluate any routing logic.
 */
export default function PostAuthPage() {
  const { status } = useSession()
  const router = useRouter()
  const didRedirect = useRef(false)

  useEffect(() => {
    if (status === "loading") return
    if (didRedirect.current) return
    didRedirect.current = true

    if (status === "unauthenticated") {
      router.replace("/auth/signin")
      return
    }

    // Session is confirmed — ask the server for the routing decision.
    // This deferred fetch ensures the session cookie is stable before resolveUser runs.
    fetch("/api/auth/post-auth-route", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data: { redirect: string }) => {
        router.replace(data.redirect)
      })
      .catch(() => {
        // Network/DB error — fall back to dashboard and let it re-evaluate.
        router.replace("/dashboard")
      })
  }, [status, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
        <p className="text-sm text-zinc-400">Signing you in…</p>
      </div>
    </div>
  )
}
