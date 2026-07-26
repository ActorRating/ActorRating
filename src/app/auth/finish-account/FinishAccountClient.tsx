"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { AuthLayout } from "@/components/auth/AuthLayout"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"
import { containsBadWord } from "@/lib/validation/sanitizeName"
import { isValidUsername, normalizeUsername } from "@/lib/validation/username"

type UsernameStatus = "idle" | "invalid" | "checking" | "available" | "taken"

type Props = {
  initialUsername: string
  email: string
}

export default function FinishAccountClient({ initialUsername, email }: Props) {
  const router = useRouter()
  const [username, setUsername] = useState(initialUsername)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const usernameCheckAbortRef = useRef<AbortController | null>(null)

  const normalizedUsername = useMemo(
    () => normalizeUsername(username.toLowerCase().trim()),
    [username],
  )

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

    // Keep current username as available if it's already theirs.
    if (initialUsername && normalizedUsername === normalizeUsername(initialUsername)) {
      setUsernameStatus("available")
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
  }, [normalizedUsername, initialUsername])

  const canSubmit =
    termsAccepted &&
    usernameStatus === "available" &&
    Boolean(normalizedUsername) &&
    !isSubmitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/auth/complete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: normalizedUsername,
          termsAccepted: true,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Could not finish account setup")
        return
      }
      router.replace("/dashboard")
      router.refresh()
    } catch (err) {
      console.error(err)
      setError("Could not finish account setup")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      heroTitle="Finish your account"
      heroSubtitle="Pick a username and accept the terms to start rating"
      heroSubtitleMobile="One more step to join ActorRating"
      title="Complete signup"
      subtitle={email ? `Signed in as ${email}` : "Choose your public username"}
    >
      {error ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-md"
        >
          <p className="text-sm text-red-400 text-center">{error}</p>
        </motion.div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="relative rounded-md border border-white/[0.06] bg-[#0a0a0a] p-4 sm:p-5 space-y-3 sm:space-y-5"
      >
        <div>
          <div className="relative">
            <input
              type="text"
              id="finish-username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError("")
              }}
              onFocus={() => setFocusedField("username")}
              onBlur={() => setFocusedField(null)}
              required
              disabled={isSubmitting}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className={`floating-input w-full px-5 sm:px-6 pt-5 pb-2 bg-[#0a0a0a] border rounded-md text-base text-white outline-none focus:ring-0 focus:border-[#FFD700]/50 transition-colors duration-200 disabled:opacity-50 ${
                username ? "has-value" : ""
              } ${
                usernameStatus === "taken" || usernameStatus === "invalid"
                  ? "border-red-500"
                  : "border-[#2a2a2a] hover:border-[#FFD700]/20"
              }`}
              placeholder=" "
            />
            <label
              htmlFor="finish-username"
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
                  : "3–20 characters: a–z, 0–9, underscore"}
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            disabled={isSubmitting}
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

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full px-6 sm:px-8 py-3.5 rounded-md text-black text-[15px] sm:text-base font-bold transition-transform duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[48px]"
          style={{
            background: "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)",
          }}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <BouncingBallsLoader size="sm" color="#000000" className="mb-0" />
              Saving…
            </span>
          ) : (
            "Continue to dashboard"
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
