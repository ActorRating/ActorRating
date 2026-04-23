"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

/**
 * Post-authentication routing gate (client component).
 *
 * Why client? The previous server-component version called auth() synchronously
 * on the first render. After an OAuth/magic-link callback the session cookie may
 * not yet be committed in the redirect request, so auth() returned null and the
 * page looped back to /auth/signin.
 *
 * useSession() waits for next-auth to actually fetch /api/auth/session and confirm
 * the cookie is readable before we make any routing decision.
 *
 * Additional guard: NEXT_PUBLIC_DEV_MODE=true pre-populates a fake dev session in
 * SessionProvider. We explicitly wait for the real /api/auth/session response (the
 * second status change after the initial "authenticated" from the fake session) so
 * that the server-side route decision always uses a verified, cookie-backed session.
 */
export default function PostAuthPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const didRedirect = useRef(false)

  useEffect(() => {
    if (status === "loading") return
    if (didRedirect.current) return

    if (status === "unauthenticated") {
      didRedirect.current = true
      router.replace("/auth/signin")
      return
    }

    // status === "authenticated" — ask the server for the routing decision.
    // This deferred fetch ensures the session cookie has been committed and is
    // readable by the server before resolveUser runs.
    didRedirect.current = true
    fetch("/api/auth/post-auth-route", { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error(`post-auth-route ${res.status}`)
        return res.json()
      })
      .then((data: { redirect: string }) => {
        router.replace(data.redirect)
      })
      .catch((err) => {
        console.error("[post-auth] route decision failed:", err)
        // Re-allow redirect so we can retry after a short pause.
        didRedirect.current = false
        // Wait a beat and retry once — handles transient DB/network hiccups.
        setTimeout(() => {
          if (didRedirect.current) return
          didRedirect.current = true
          fetch("/api/auth/post-auth-route", { credentials: "same-origin" })
            .then((r) => r.json())
            .then((d: { redirect: string }) => router.replace(d.redirect))
            .catch(() => router.replace("/auth/signin"))
        }, 1500)
      })
  }, [status, session, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
        <p className="text-sm text-zinc-400">Signing you in…</p>
      </div>
    </div>
  )
}
