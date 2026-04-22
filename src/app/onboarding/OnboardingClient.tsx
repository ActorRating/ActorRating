"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/components/providers/SessionProvider"
import { Button } from "@/components/ui/Button"
import { isValidUsername, normalizeUsername } from "@/lib/validation/username"
import { CheckCircle2, Sparkles, UserRound } from "lucide-react"

type UsernameStatus = "idle" | "invalid" | "checking" | "available" | "taken"

function buildSuggestedUsername(seed: string): string {
  const cleaned = seed.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").slice(0, 20)
  if (cleaned.length >= 3) return cleaned
  return `${cleaned}user`.slice(0, 20).padEnd(3, "0")
}

export default function OnboardingClient() {
  const user = useUser()
  const router = useRouter()

  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [inlineError, setInlineError] = useState("")
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle")
  const [hasStartedOnboarding, setHasStartedOnboarding] = useState(false)

  const normalizedUsername = useMemo(() => normalizeUsername(username), [username])

  useEffect(() => {
    if (!user) return

    const emailLocal = user.email?.split("@")[0] || ""
    const fallbackName = user.name?.trim() || emailLocal || ""
    if (!name && fallbackName) {
      setName(fallbackName)
    }
    if (!username) {
      const seed = user.name?.trim() || emailLocal
      if (seed) {
        setUsername(buildSuggestedUsername(seed))
      }
    }
  }, [user, name, username])

  useEffect(() => {
    if (!hasStartedOnboarding) {
      setUsernameStatus("idle")
      return
    }

    if (!normalizedUsername) {
      setUsernameStatus("idle")
      return
    }

    if (!isValidUsername(normalizedUsername)) {
      setUsernameStatus("invalid")
      return
    }

    setUsernameStatus("checking")
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/check-username?username=${encodeURIComponent(normalizedUsername)}`)
        const data = await res.json()
        setUsernameStatus(data?.available ? "available" : "taken")
      } catch (error) {
        console.error("Username availability check error:", error)
        setUsernameStatus("taken")
      }
    }, 350)

    return () => clearTimeout(timeout)
  }, [normalizedUsername, hasStartedOnboarding])

  const isValid = useMemo(() => {
    return name.trim().length > 0 && usernameStatus === "available"
  }, [name, usernameStatus])

  const ensureOnboardingStarted = async () => {
    if (hasStartedOnboarding) return true
    try {
      setIsStarting(true)
      const res = await fetch("/api/onboarding/start", { method: "POST" })
      if (!res.ok) {
        setInlineError("Unable to start setup. Please refresh and try again.")
        return false
      }
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
        setInlineError("Please choose a different name")
        return
      }

      const completeRes = await fetch("/api/onboarding/complete", {
        method: "POST",
      })
      if (!completeRes.ok) {
        setInlineError("Unable to complete setup. Please try again.")
        return
      }

      setIsSaved(true)
      setTimeout(() => {
        router.push("/post-auth")
      }, 650)
    } catch (error) {
      console.error("Onboarding submit error:", error)
      setInlineError("Please choose a different name")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-6 sm:py-8">
      <div className="w-full max-w-xl">
        <div
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#1a1a1a]/95 via-[#121212]/95 to-black/95 p-6 sm:p-8"
          style={{
            boxShadow:
              "0 25px 70px -15px rgba(0, 0, 0, 0.9), 0 15px 40px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
          }}
        >
          <div className="pointer-events-none absolute -right-14 -top-12 h-56 w-56 rounded-full bg-[#FFD700]/10 blur-3xl" />
          <div className="relative z-10 mb-6 text-center sm:mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-3 py-1 text-xs text-[#FFE082]">
              <Sparkles className="h-3.5 w-3.5" />
              Public profile setup
            </div>
            <h2
              className="text-3xl font-bold text-white sm:text-4xl"
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              Create Your Identity
            </h2>
            <p className="mt-2 text-sm text-[#a1a1aa] sm:text-base">
              Choose how your ratings appear publicly on ActorRating.
            </p>
          </div>

          <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-[#d4d4d8]">Display name</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setInlineError("")
              }}
              className="h-12 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 text-white outline-none transition focus:border-[#FFD700]/60"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-[#d4d4d8]">Username</label>
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setInlineError("")
              }}
              className="h-12 w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 text-white outline-none transition focus:border-[#FFD700]/60"
              placeholder="username"
            />
            <p className="mt-1 text-xs text-[#71717a]">3-20 chars, lowercase letters, numbers, underscore</p>
            {usernameStatus === "available" ? <p className="mt-1 text-xs text-emerald-400">Available</p> : null}
            {usernameStatus === "taken" ? <p className="mt-1 text-xs text-rose-400">Already taken</p> : null}
            {usernameStatus === "invalid" ? <p className="mt-1 text-xs text-amber-400">Invalid format</p> : null}
            {usernameStatus === "checking" ? <p className="mt-1 text-xs text-[#71717a]">Checking availability...</p> : null}
            {normalizedUsername ? (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#d4d4d8]">
                <UserRound className="h-3.5 w-3.5" />
                <span>/u/{normalizedUsername}</span>
              </div>
            ) : null}
          </div>

            {inlineError ? <p className="text-sm text-rose-400">{inlineError}</p> : null}
            {isSaved ? (
              <p className="inline-flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Your profile is ready.
              </p>
            ) : null}

            {!hasStartedOnboarding ? (
              <Button
                onClick={ensureOnboardingStarted}
                disabled={isStarting}
                className="mx-auto h-14 min-w-[220px] rounded-full px-10 text-base font-bold tracking-wide text-black transition-all duration-300 hover:scale-[1.02] disabled:hover:scale-100"
                style={{
                  background: "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)",
                  boxShadow: "0 0 20px rgba(255, 215, 0, 0.25), 0 0 40px rgba(255, 215, 0, 0.15)",
                }}
              >
                {isStarting ? "Starting..." : "Start Setup"}
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
                className="h-12 w-full rounded-full text-base font-bold tracking-wide text-black transition-all duration-300 hover:scale-[1.02] disabled:hover:scale-100"
                style={{
                  background: "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)",
                  boxShadow: "0 0 20px rgba(255, 215, 0, 0.25), 0 0 40px rgba(255, 215, 0, 0.15)",
                }}
              >
                {isSubmitting ? "Saving..." : "Complete Setup"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

