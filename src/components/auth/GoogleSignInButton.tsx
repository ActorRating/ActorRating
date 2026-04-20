"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { FcGoogle } from "react-icons/fc"

const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_AVAILABLE === "1"

export function GoogleSignInButton() {
  const [busy, setBusy] = useState(false)

  if (!googleEnabled) return null

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true)
        void signIn("google", { callbackUrl: "/auth/signin-success" })
      }}
      className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-full border border-white/15 bg-white/[0.07] text-white text-sm sm:text-base font-semibold tracking-wide hover:border-[#FFD700]/45 hover:bg-[#FFD700]/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <FcGoogle className="w-6 h-6 shrink-0" aria-hidden />
      {busy ? "Redirecting..." : "Continue with Google"}
    </button>
  )
}
