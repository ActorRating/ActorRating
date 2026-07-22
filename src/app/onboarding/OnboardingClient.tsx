"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/components/providers/SessionProvider"
import { Button } from "@/components/ui/Button"
import { isValidUsername, normalizeUsername } from "@/lib/validation/username"
import { containsBadWord } from "@/lib/validation/sanitizeName"
import { UserRound } from "lucide-react"

type UsernameStatus = "idle" | "invalid" | "checking" | "available" | "taken"

function buildSuggestedUsername(seed: string): string {
  const cleaned = seed.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").slice(0, 20)
  if (cleaned.length >= 3) return cleaned
  return `${cleaned}user`.slice(0, 20).padEnd(3, "0")
}

function isGenericPlaceholderName(value?: string | null): boolean {
  if (!value) return false
  return value.trim().toLowerCase() === "user"
}

export default function OnboardingClient() {
  const user = useUser()
  const router = useRouter()

  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [inlineError, setInlineError] = useState("")
  const [usernameError, setUsernameError] = useState("")
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle")
  const [hasStartedOnboarding, setHasStartedOnboarding] = useState(false)
  const usernameCheckAbortRef = useRef<AbortController | null>(null)
  const usernameAvailabilityCacheRef = useRef<Map<string, boolean>>(new Map())
  const usernameInFlightRef = useRef<Map<string, AbortController>>(new Map())
  const hasHydratedDefaultsRef = useRef(false)

  const normalizedUsername = useMemo(() => {
    const normalizedInput = username.toLowerCase().trim().replace(/\s{2,}/g, " ")
    return normalizeUsername(normalizedInput)
  }, [username])

  const normalizedUsernameForBannedCheck = useMemo(() => {
    return normalizedUsername
      .replace(/@/g, "a")
      .replace(/4/g, "a")
      .replace(/\$/g, "s")
      .replace(/0/g, "o")
      .replace(/1/g, "i")
      .replace(/[^a-z0-9]/g, "")
  }, [normalizedUsername])

  useEffect(() => {
    if (!user || hasHydratedDefaultsRef.current) return

    const emailLocal = user.email?.split("@")[0] || ""
    const safeSessionName = isGenericPlaceholderName(user.name) ? "" : user.name?.trim() || ""
    const fallbackName = safeSessionName || emailLocal || ""
    const seed = safeSessionName || emailLocal

    if (fallbackName) {
      setName(fallbackName)
    }
    if (seed) {
      setUsername(buildSuggestedUsername(seed))
    }
    hasHydratedDefaultsRef.current = true
  }, [user])

  useEffect(() => {
    usernameCheckAbortRef.current?.abort()

    if (!normalizedUsername) {
      setUsernameStatus("idle")
      setUsernameError("")
      return
    }

    if (!isValidUsername(normalizedUsername)) {
      setUsernameStatus("invalid")
      setUsernameError("Invalid format")
      return
    }

    const bannedWordPattern = /\b(ass|fuck|shit|bitch|asshole|bastard|cunt|dick|pussy|nigger|nigga|faggot|retard|whore|slut|kike|chink|spic|twat)\b/
    if (containsBadWord(normalizedUsernameForBannedCheck) || bannedWordPattern.test(normalizedUsernameForBannedCheck)) {
      setUsernameStatus("invalid")
      setUsernameError("This username is not allowed")
      return
    }

    setUsernameError("")
    const cached = usernameAvailabilityCacheRef.current.get(normalizedUsername)
    if (typeof cached === "boolean") {
      setUsernameStatus(cached ? "available" : "taken")
      return
    }

    const controller = new AbortController()
    usernameCheckAbortRef.current = controller
    setUsernameStatus("checking")
    const timeout = setTimeout(async () => {
      const activeController = usernameInFlightRef.current.get(normalizedUsername)
      if (activeController) {
        setUsernameStatus("checking")
        return
      }

      usernameInFlightRef.current.set(normalizedUsername, controller)
      try {
        const res = await fetch(`/api/user/check-username?username=${encodeURIComponent(normalizedUsername)}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        const isAvailable = Boolean(data?.available)
        usernameAvailabilityCacheRef.current.set(normalizedUsername, isAvailable)
        setUsernameStatus(isAvailable ? "available" : "taken")
      } catch (error) {
        if ((error as Error).name === "AbortError") return
        console.error("Username availability check error:", error)
        setUsernameStatus("taken")
      } finally {
        if (usernameInFlightRef.current.get(normalizedUsername) === controller) {
          usernameInFlightRef.current.delete(normalizedUsername)
        }
      }
    }, 400)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [normalizedUsername, normalizedUsernameForBannedCheck])

  const isValid = useMemo(() => {
    return name.trim().length > 0 && usernameStatus === "available"
  }, [name, usernameStatus])

  const ensureOnboardingStarted = async () => {
    if (hasStartedOnboarding) return true
    setInlineError("")
    try {
      setIsStarting(true)
      const res = await fetch("/api/onboarding/start", { method: "POST" })
      if (!res.ok) {
        setInlineError("Unable to start setup. Please refresh and try again.")
        return false
      }
      router.refresh()
      setHasStartedOnboarding(true)
      return true
    } catch (error) {
      console.error("Onboarding start error:", error)
      setInlineError("Unable to start setup. Please refresh and try again.")
      return false
    } finally {
      setIsStarting(false)
    }
  }

  const handleSubmit = async () => {
    if (!hasStartedOnboarding || !isValid) return

    // Client-side guard: should be caught by isValid, but be explicit
    if (!name.trim()) {
      setInlineError("Display name is required")
      return
    }
    if (!normalizedUsername) {
      setUsernameError("Username is required")
      return
    }

    setInlineError("")
    setIsSubmitting(true)

    try {
      const profileRes = await fetch("/api/user/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: normalizedUsername,
        }),
      })

      if (!profileRes.ok) {
        const errData = await profileRes.json().catch(() => ({}))
        const msg = errData?.error ?? "Setup failed. Please try again."
        // Surface username-specific errors on the username field
        if (msg.toLowerCase().includes("username")) {
          setUsernameError(msg)
          setUsernameStatus("taken")
        } else {
          setInlineError(msg)
        }
        console.error("[onboarding] update-profile failed:", { status: profileRes.status, error: msg })
        return
      }

      const completeRes = await fetch("/api/onboarding/complete", {
        method: "POST",
      })
      if (!completeRes.ok) {
        const errData = await completeRes.json().catch(() => ({}))
        console.error("[onboarding] complete failed:", { status: completeRes.status, error: errData?.error })
        setInlineError("Unable to complete setup. Please try again.")
        return
      }

      router.push("/dashboard")
    } catch (error) {
      console.error("[onboarding] submit error:", error)
      setInlineError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-5 sm:px-8 py-16">
      <div className="relative w-full max-w-md overflow-hidden rounded-md border border-white/[0.08] bg-[#141414] p-6 sm:p-8">
        <div className="mb-6 text-center sm:mb-8">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FFD700]/70 mb-3">
            Public profile
          </p>
          <h1
            className="text-3xl sm:text-[2.5rem] font-bold text-white tracking-tight leading-[1.15]"
            style={{
              fontFamily:
                'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
            }}
          >
            Create your identity
          </h1>
          <p className="mt-3 text-[15px] sm:text-base text-zinc-500 leading-relaxed">
            Choose how your ratings appear publicly on ActorRating.
          </p>
        </div>

        <div className="space-y-5">
          <input
            type="text"
            name="username"
            autoComplete="username"
            tabIndex={-1}
            aria-hidden="true"
            style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
            readOnly
          />
          <div>
            <label className="mb-2 block text-sm text-zinc-400">Display name</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setInlineError("")
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="h-12 w-full rounded-md border border-white/10 bg-[#0a0a0a] px-4 text-white outline-none transition focus:border-[#FFD700]/50"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">Username</label>
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setInlineError("")
                setUsernameError("")
              }}
              name="user_handle"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="h-12 w-full rounded-md border border-white/10 bg-[#0a0a0a] px-4 text-white outline-none transition focus:border-[#FFD700]/50"
              placeholder="username"
            />
            <p className="mt-1.5 text-xs text-zinc-600">
              3–20 chars, lowercase letters, numbers, underscore
            </p>
            {usernameStatus === "available" ? (
              <p className="mt-1 text-xs text-emerald-400">Available</p>
            ) : null}
            {usernameStatus === "taken" ? (
              <p className="mt-1 text-xs text-rose-400">Already taken</p>
            ) : null}
            {usernameStatus === "invalid" && usernameError ? (
              <p className="mt-1 text-xs text-amber-400">{usernameError}</p>
            ) : null}
            {usernameStatus === "checking" ? (
              <p className="mt-1 text-xs text-zinc-600">Checking availability…</p>
            ) : null}
            {normalizedUsername ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-500">
                <UserRound className="h-3.5 w-3.5" />
                <span>/u/{normalizedUsername}</span>
              </p>
            ) : null}
          </div>

          {inlineError ? <p className="text-sm text-rose-400">{inlineError}</p> : null}

          {!hasStartedOnboarding ? (
            <Button
              onClick={ensureOnboardingStarted}
              disabled={isStarting}
              className="h-12 w-full rounded-md font-bold text-black transition-transform hover:scale-[1.02] disabled:hover:scale-100 min-h-[48px]"
              style={{
                background:
                  "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)",
              }}
            >
              {isStarting ? "Starting…" : "Start setup"}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="h-12 w-full rounded-md text-[15px] font-bold text-black transition-transform hover:scale-[1.02] disabled:hover:scale-100 min-h-[48px]"
              style={{
                background:
                  "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)",
              }}
            >
              {isSubmitting ? "Saving…" : "Complete setup"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

