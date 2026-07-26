"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { signIn } from "next-auth/react"
import { validateEmail } from "@/lib/validation"
import { validateEmailDetailed } from "@/lib/authEmailValidation"
import { isValidUsername, normalizeUsername } from "@/lib/validation/username"
import { containsBadWord } from "@/lib/validation/sanitizeName"
import { motion } from "framer-motion"
import { FaEnvelope } from "react-icons/fa"
import Link from "next/link"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"
import { AuthLayout } from "@/components/auth/AuthLayout"
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton"

const showGoogleDivider = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_AVAILABLE === "1"

type UsernameStatus = "idle" | "invalid" | "checking" | "available" | "taken"

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [mounted, setMounted] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle")
  const searchParams = useSearchParams()
  const usernameCheckAbortRef = useRef<AbortController | null>(null)

  const normalizedUsername = useMemo(
    () => normalizeUsername(username.toLowerCase().trim()),
    [username],
  )

  useEffect(() => {
    setMounted(true)
  }, [])

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
    } else if (error === "EmailSignin") {
      setApiError("Unable to send magic link. Please try again.")
    } else {
      setApiError("Sign-up failed. Please try again.")
    }
  }, [searchParams])

  useEffect(() => {
    usernameCheckAbortRef.current?.abort()

    if (!normalizedUsername) {
      setUsernameStatus("idle")
      return
    }

    if (!isValidUsername(normalizedUsername) || containsBadWord(normalizedUsername)) {
      setUsernameStatus("invalid")
      return
    }

    setUsernameStatus("checking")
    const controller = new AbortController()
    usernameCheckAbortRef.current = controller
    const timer = setTimeout(() => {
      void fetch(`/api/user/check-username?username=${encodeURIComponent(normalizedUsername)}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            setUsernameStatus("invalid")
            return
          }
          const data = (await res.json()) as { available?: boolean }
          setUsernameStatus(data.available ? "available" : "taken")
        })
        .catch((err) => {
          if (err?.name === "AbortError") return
          setUsernameStatus("invalid")
        })
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [normalizedUsername])

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
    }
    setApiError("")
    setSuccessMessage("")
  }

  const validateSignupFields = (requireEmail: boolean) => {
    const newErrors: Record<string, string> = {}

    if (!normalizedUsername || !isValidUsername(normalizedUsername) || containsBadWord(normalizedUsername)) {
      newErrors.username = "Choose a valid username (3–20 chars, a–z, 0–9, _)"
    } else if (usernameStatus === "taken") {
      newErrors.username = "Username already taken"
    } else if (usernameStatus === "checking" || usernameStatus === "idle") {
      newErrors.username = "Wait for username check"
    }

    if (!termsAccepted) {
      newErrors.terms = "You must agree to the Terms"
    }

    if (requireEmail) {
      const emailValidation = validateEmail(email.trim())
      if (!emailValidation.isValid) {
        newErrors.email = emailValidation.error!
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const stashPendingSignup = async (includeEmail: boolean) => {
    const res = await fetch("/api/auth/pending-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: normalizedUsername,
        termsAccepted: true,
        ...(includeEmail ? { email: email.trim().toLowerCase() } : {}),
      }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(data.error || "Could not save signup details")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateSignupFields(true)) return

    setIsLoading(true)
    setApiError("")

    try {
      await stashPendingSignup(true)
      const normalizedEmail = email.trim().toLowerCase()
      if (typeof window !== "undefined") {
        localStorage.setItem("pending_signup_method", "email")
      }
      const result = await signIn("email", {
        email: normalizedEmail,
        callbackUrl: "/auth/signup-success",
        redirect: false,
      })
      if (result?.error) {
        setApiError("Unable to send magic link. Please try again.")
        return
      }
      setSuccessMessage(`Magic link sent to ${normalizedEmail}. Check your inbox.`)
    } catch (error) {
      console.error("Signup error:", error)
      setApiError(error instanceof Error ? error.message : "Unable to send magic link. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleBeforeSignIn = async () => {
    if (!validateSignupFields(false)) return false
    try {
      await stashPendingSignup(false)
      return true
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Could not start Google sign-up")
      return false
    }
  }

  const formReady =
    termsAccepted &&
    usernameStatus === "available" &&
    Boolean(normalizedUsername) &&
    !isLoading

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BouncingBallsLoader size="md" color="#FFD700" />
      </div>
    )
  }

  return (
    <AuthLayout
      heroTitle="Join ActorRating"
      heroSubtitle="Pick a username, agree to the terms, and start rating performances"
      heroSubtitleMobile="Create your account in seconds"
      title="Create Account"
      subtitle="Choose a username and sign up with email or Google"
    >
      {successMessage ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 sm:p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-md"
        >
          <p className="text-sm text-emerald-300 text-center">{successMessage}</p>
        </motion.div>
      ) : null}

      {apiError ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-md"
        >
          <p className="text-sm text-red-400 text-center">{apiError}</p>
        </motion.div>
      ) : null}

      <div className="relative rounded-md border border-white/[0.06] bg-[#0a0a0a] p-4 sm:p-5 space-y-3 sm:space-y-5">
        <div>
          <div className="relative">
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setApiError("")
                setErrors((prev) => ({ ...prev, username: "" }))
              }}
              onFocus={() => setFocusedField("username")}
              onBlur={() => setFocusedField(null)}
              required
              disabled={isLoading}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className={`floating-input w-full px-5 sm:px-6 pt-5 pb-2 bg-[#0a0a0a] border rounded-md text-base text-white outline-none focus:ring-0 focus:border-[#FFD700]/50 transition-colors duration-200 disabled:opacity-50 ${
                username ? "has-value" : ""
              } ${
                errors.username || usernameStatus === "taken" || usernameStatus === "invalid"
                  ? "border-red-500"
                  : "border-[#2a2a2a] hover:border-[#FFD700]/20"
              }`}
              placeholder=" "
            />
            <label
              htmlFor="username"
              className={`floating-label absolute left-5 sm:left-6 text-sm sm:text-base pointer-events-none transition-all duration-200 origin-left ${
                username || focusedField === "username" ? "floating-label-active" : "text-[#737373]"
              }`}
            >
              Username
            </label>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            {usernameStatus === "checking"
              ? "Checking availability…"
              : usernameStatus === "available"
                ? "Username is available"
                : usernameStatus === "taken"
                  ? "Username already taken"
                  : usernameStatus === "invalid"
                    ? "3–20 characters: a–z, 0–9, underscore"
                    : "This will be your public profile URL"}
          </p>
          {errors.username ? (
            <p className="mt-1 text-sm text-red-400">{errors.username}</p>
          ) : null}
        </div>

        {showGoogleDivider ? (
          <div className="space-y-3 sm:space-y-4">
            <GoogleSignInButton
              disabled={!formReady}
              beforeSignIn={handleGoogleBeforeSignIn}
            />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#0a0a0a] px-3 text-zinc-600 uppercase tracking-wider">
                  or continue with email
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
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
                disabled={isLoading}
                autoComplete="email"
                className={`floating-input w-full px-5 sm:px-6 pt-5 pb-2 bg-[#0a0a0a] border rounded-md text-base text-white outline-none focus:ring-0 focus:border-[#FFD700]/50 transition-colors duration-200 disabled:opacity-50 ${
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

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked)
                setErrors((prev) => ({ ...prev, terms: "" }))
              }}
              disabled={isLoading}
              className="mt-1 h-4 w-4 rounded border-[#2a2a2a] bg-[#0a0a0a] text-[#FFD700] focus:ring-[#FFD700]/40"
            />
            <span className="text-[11px] sm:text-xs text-gray-400 leading-relaxed">
              I agree to the{" "}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#FFD700] hover:underline">
                Terms
              </Link>
              ,{" "}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#FFD700] hover:underline">
                Privacy
              </Link>
              , and{" "}
              <Link href="/kvkk" target="_blank" rel="noopener noreferrer" className="text-[#FFD700] hover:underline">
                KVKK
              </Link>
            </span>
          </label>
          {errors.terms ? <p className="text-sm text-red-400">{errors.terms}</p> : null}

          <button
            type="submit"
            disabled={isLoading || !formReady}
            className="w-full group px-6 sm:px-8 py-3.5 rounded-md text-black text-[15px] sm:text-base font-bold transition-transform duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[48px]"
            style={{
              background: "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)",
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2 sm:gap-3 whitespace-nowrap">
                <BouncingBallsLoader size="sm" color="#000000" className="mb-0" />
                Sending link...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2 sm:gap-3 whitespace-nowrap group">
                Create account
                <FaEnvelope className="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            )}
          </button>
        </form>
      </div>

      <div className="mt-5 pt-4 border-t border-white/[0.06] text-center">
        <p className="text-sm text-gray-400">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-[#FFD700] font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
