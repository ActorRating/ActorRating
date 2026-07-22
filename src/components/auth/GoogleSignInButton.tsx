"use client"

import { useState } from "react"
import { signIn, signOut } from "next-auth/react"
import { FcGoogle } from "react-icons/fc"
import { acquireAuthLock, authLockRemainingMs, releaseAuthLock } from "@/lib/auth/clientAuthLock"

const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_AVAILABLE === "1"

export function GoogleSignInButton() {
  const [busy, setBusy] = useState(false)

  if (!googleEnabled) return null

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (!acquireAuthLock("google-signin")) {
          const seconds = Math.ceil(authLockRemainingMs() / 1000)
          console.warn(`[auth] Google auth blocked: another auth flow in progress (${seconds}s)`)
          return
        }
        setBusy(true)
        void (async () => {
          try {
            if (typeof window !== "undefined") {
              const isRegisterFlow = window.location.pathname === "/auth/register"
              if (isRegisterFlow) {
                localStorage.setItem("pending_signup_method", "google")
              } else {
                localStorage.setItem("pending_signin_method", "google")
              }
            }
            // Ensure we start every provider auth flow with a clean session.
            await signOut({ redirect: false })
          } catch (err) {
            console.warn("[auth][google] pre-signout failed", err)
          }
          await signIn("google", { callbackUrl: "/post-auth" })
          setTimeout(() => releaseAuthLock(), 15_000)
        })().catch(() => {
          releaseAuthLock()
          setBusy(false)
        })()
      }}
      className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-md border border-white/10 bg-white/[0.04] text-white text-sm sm:text-base font-semibold hover:border-[#FFD700]/40 hover:bg-[#FFD700]/10 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
    >
      <FcGoogle className="w-6 h-6 shrink-0" aria-hidden />
      {busy ? "Redirecting..." : "Continue with Google"}
    </button>
  )
}
