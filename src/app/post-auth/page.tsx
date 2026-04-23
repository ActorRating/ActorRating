"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

/**
 * Post-authentication routing gate.
 *
 * Intentionally does NOT use useSession() for routing decisions.
 *
 * Why: the layout's SessionProvider initialises NextAuth with session={null}
 * (no SSR session in production). NextAuth treats null as "unauthenticated"
 * on the very first render — before it has had a chance to fetch
 * /api/auth/session and confirm the real cookie. Any code that checks
 * status === "unauthenticated" and redirects to /auth/signin therefore fires
 * immediately after an OAuth callback, before the session is hydrated, causing
 * an infinite /post-auth ↔ /auth/signin loop.
 *
 * The correct approach: call /api/auth/post-auth-route directly. That route
 * handler calls auth() server-side, which reads the cookie from the *request*
 * headers. The cookie IS present in these headers — it was set by the OAuth
 * callback response and the browser included it in this page request and in
 * the subsequent fetch. No client-side session hydration is needed.
 */
export default function PostAuthPage() {
  const router = useRouter()
  const hasFetched = useRef(false)

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    const decide = (attempt = 1) => {
      fetch("/api/auth/post-auth-route", { credentials: "same-origin" })
        .then((res) => {
          if (!res.ok) throw new Error(`post-auth-route returned ${res.status}`)
          return res.json()
        })
        .then((data: { redirect: string }) => {
          router.replace(data.redirect)
        })
        .catch((err) => {
          console.error(`[post-auth] attempt ${attempt} failed:`, err)
          if (attempt < 3) {
            // Exponential back-off: 1 s, 2 s, then give up
            setTimeout(() => decide(attempt + 1), attempt * 1000)
          } else {
            // After 3 failures fall back to sign-in; user can re-authenticate
            router.replace("/auth/signin")
          }
        })
    }

    decide()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
        <p className="text-sm text-zinc-400">Signing you in…</p>
      </div>
    </div>
  )
}
