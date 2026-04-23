"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { signIn, signOut } from "next-auth/react"
import { validateEmail } from "@/lib/validation"
import { validateEmailDetailed } from "@/lib/authEmailValidation"
import { motion } from "framer-motion"
import { FaEnvelope } from "react-icons/fa"
import Link from "next/link"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"
import { AuthLayout } from "@/components/auth/AuthLayout"
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton"
import { acquireAuthLock, authLockRemainingMs, releaseAuthLock } from "@/lib/auth/clientAuthLock"

const showGoogleDivider = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_AVAILABLE === "1"

function SignInContent() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [hasSentLink, setHasSentLink] = useState(false)
  const [email, setEmail] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [mounted, setMounted] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
  }, [])

  // No client-side auth redirect here.
  // Middleware (src/middleware.ts) redirects authenticated users away from
  // /auth/signin → /dashboard before this page is ever rendered.
  // A client-side redirect would race against session hydration timing
  // and could cause signin ↔ post-auth loops.

  useEffect(() => {
    if (cooldownRemaining <= 0) return
    const interval = window.setInterval(() => {
      setCooldownRemaining((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [cooldownRemaining])

  useEffect(() => {
    if (!searchParams) return

    const error = searchParams.get("error")
    const wasSent = searchParams.get("sent")
    const emailFromQuery = searchParams.get("email")

    if (wasSent === "true" && emailFromQuery) {
      setSuccessMessage(`Magic link sent to ${emailFromQuery}. Check your inbox.`)
      setEmail(emailFromQuery)
    }

    if (!error) return

    if (error === "Verification") {
      setApiError("This login link is invalid or expired. Request a new one.")
    } else if (error === "ACCOUNT_PROVIDER_MISMATCH") {
      setApiError("You're trying to sign in with a different method than the one originally used for this account. Please use your original sign-in method.")
    } else if (error?.includes("RATE_LIMIT")) {
      setApiError("Too many requests, try again later.")
    } else if (error?.includes("DISPOSABLE_EMAIL")) {
      setApiError("Please use a valid email provider.")
    } else if (error === "EmailSignin") {
      setApiError("Unable to send magic link. Please try again.")
    } else {
      setApiError("Sign-in failed. Please try again.")
    }
  }, [searchParams])

  const handleEmailChange = (value: string) => {
    setEmail(value)
    if (value.length === 0) {
      setErrors((prev) => ({ ...prev, email: "" }))
    } else {
      const validation = validateEmailDetailed(value)
      setErrors((prev) => ({
        ...prev,
        email: validation.isValid ? "" : validation.error || "Please enter a valid email address",
      }))
      if (validation.isValid && errors.email) {
        setErrors((prev) => ({ ...prev, email: "" }))
      }
    }
    setApiError("")
    setSuccessMessage("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting || cooldownRemaining > 0) return

    const emailValidation = validateEmail(email.trim())
    const newErrors: Record<string, string> = {}
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error!
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    setApiError("")

    try {
      if (!acquireAuthLock("email-signin")) {
        const seconds = Math.ceil(authLockRemainingMs() / 1000)
        setApiError(`Another sign-in attempt is in progress. Please wait ${seconds}s and try again.`)
        return
      }
      const normalizedEmail = email.trim().toLowerCase()
      try {
        // Ensure magic-link requests start from a clean auth state.
        await signOut({ redirect: false })
      } catch (err) {
        console.warn("[auth][email] pre-signout failed", err)
      }
      const result = await signIn("email", {
        email: normalizedEmail,
        callbackUrl: "/post-auth",
        redirect: false,
      })
      if (result?.error) {
        releaseAuthLock()
        if (result.error.includes("RATE_LIMIT")) {
          setApiError("Too many requests, try again later.")
        } else if (result.error.includes("DISPOSABLE_EMAIL")) {
          setApiError("Please use a valid email provider.")
        } else if (result.error.includes("ACCOUNT_PROVIDER_MISMATCH")) {
          setApiError("You're trying to sign in with a different method than the one originally used for this account. Please use your original sign-in method.")
        } else {
          setApiError("Unable to send magic link. Please try again.")
        }
        return
      }
      setSuccessMessage(`Magic link sent to ${normalizedEmail}. Check your inbox.`)
      setHasSentLink(true)
      setCooldownRemaining(60)
      setTimeout(() => releaseAuthLock(), 15_000)
    } catch (error) {
      console.error("Signin error:", error)
      setApiError("Unable to send magic link. Please try again.")
      releaseAuthLock()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BouncingBallsLoader size="md" color="#FFD700" />
      </div>
    )
  }

  return (
    <AuthLayout
      heroTitle="Continue with Magic Link"
      heroSubtitle="Sign in securely with a one-time link sent to your email"
      heroSubtitleMobile="Sign in with a secure magic link"
      title="Sign In"
      subtitle="Enter your email and we will send a login link"
    >
      {successMessage ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 sm:p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
        >
          <p className="text-sm text-emerald-300 text-center">{successMessage}</p>
        </motion.div>
      ) : null}

      {apiError ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
        >
          <p className="text-sm text-red-400 text-center">{apiError}</p>
        </motion.div>
      ) : null}

      {showGoogleDivider ? (
        <div className="mb-4 space-y-3 sm:space-y-5">
          <GoogleSignInButton />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#FFD700]/15" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 px-3 text-gray-500 uppercase tracking-wider">
                or continue with email
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="relative bg-[rgba(10,10,10,0.85)] backdrop-blur-xl border border-transparent rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-7 transition-all duration-300"
        style={{
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: `
                    0 25px 70px -15px rgba(0, 0, 0, 0.9),
                    0 15px 40px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  `,
          transform: "translateY(-6px) perspective(1000px) rotateX(1.5deg)",
          transformStyle: "preserve-3d",
        }}
      >
        <form onSubmit={handleSubmit} className="relative space-y-3 sm:space-y-5">
          <div>
            <div className="relative">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                required
                disabled={isSubmitting}
                autoComplete="email"
                className={`floating-input w-full px-5 sm:px-6 pt-5 pb-2 sm:pt-5 sm:pb-2 bg-black/50 border rounded-xl text-base text-white outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-[#FFD700]/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  email ? "has-value" : ""
                } ${
                  errors.email ? "border-red-500 focus:border-red-500" : "border-[#2a2a2a] hover:border-[#FFD700]/20"
                }`}
                placeholder=" "
              />
              <label
                htmlFor="email"
                className={`floating-label absolute left-5 sm:left-6 text-sm sm:text-base pointer-events-none transition-all duration-200 origin-left ${
                  email || focusedField === "email" ? "floating-label-active" : "text-[#737373]"
                }`}
              >
                Email Address
              </label>
            </div>
            {errors.email ? (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-sm text-red-400"
              >
                {errors.email}
              </motion.p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || cooldownRemaining > 0}
            className="w-full group px-6 sm:px-8 py-3.5 sm:py-4 rounded-full text-black text-base sm:text-lg font-bold tracking-wide sm:tracking-wider transition-all duration-400 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)",
              transform: "scale(1)",
              boxShadow: "0 0 20px rgba(255, 215, 0, 0.25), 0 0 40px rgba(255, 215, 0, 0.15)",
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.transform = "scale(1.03)"
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)"
            }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2 sm:gap-3 whitespace-nowrap">
                <BouncingBallsLoader size="sm" color="#000000" className="mb-0" />
                Sending link...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2 sm:gap-3 whitespace-nowrap group">
                {cooldownRemaining > 0
                  ? `Check your email (${cooldownRemaining}s)`
                  : hasSentLink
                    ? "Resend link"
                    : "Email me a magic link"}
                <FaEnvelope className="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            )}
          </button>
        </form>
      </div>

      <div className="mt-5 pt-4 border-t border-[#FFD700]/10 text-center">
        <p className="text-sm text-gray-400">
          New here?{" "}
          <Link href="/auth/register" className="text-[#FFD700] font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

export default function SignIn() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <BouncingBallsLoader size="md" color="#FFD700" showText={true} text="Loading..." />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  )
}
