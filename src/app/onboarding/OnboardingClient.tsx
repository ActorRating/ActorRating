"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/components/providers/SessionProvider"
import { Button } from "@/components/ui/Button"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"
import { isValidUsername, normalizeUsername } from "@/lib/validation/username"

type UsernameStatus = "idle" | "invalid" | "checking" | "available" | "taken"

function buildSuggestedUsername(seed: string): string {
  const cleaned = seed.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").slice(0, 20)
  if (cleaned.length >= 3) return cleaned
  return `${cleaned}user`.slice(0, 20).padEnd(3, "0")
}

export default function OnboardingClient() {
  const user = useUser()
  const isLoadingUser = user === undefined
  const router = useRouter()

  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [inlineError, setInlineError] = useState("")
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle")

  const normalizedUsername = useMemo(() => normalizeUsername(username), [username])

  useEffect(() => {
    if (isLoadingUser) return
    if (!user) {
      router.push("/auth/signin")
      return
    }

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
  }, [isLoadingUser, user, router, name, username])

  useEffect(() => {
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
  }, [normalizedUsername])

  const isValid = useMemo(() => {
    return name.trim().length > 0 && usernameStatus === "available"
  }, [name, usernameStatus])

  const handleSubmit = async () => {
    if (!isValid) return

    setInlineError("")
    setIsSubmitting(true)

    try {
      const profileRes = await fetch("/api/user/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: normalizedUsername,
          onboardingCompleted: true,
        }),
      })

      if (!profileRes.ok) {
        setInlineError("Please choose a different name")
        return
      }

      setIsSaved(true)
      setTimeout(() => {
        router.push("/dashboard")
      }, 650)
    } catch (error) {
      console.error("Onboarding submit error:", error)
      setInlineError("Please choose a different name")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BouncingBallsLoader size="lg" color="#FFD700" showText text="Loading..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
          Welcome to ActorRating
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">Set up your public profile.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-secondary py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-border space-y-4">
          <div>
            <label className="block text-sm mb-2 text-foreground">Display name</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setInlineError("")
              }}
              className="w-full h-11 rounded-md border border-border bg-background px-3 text-foreground"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-foreground">Username</label>
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setInlineError("")
              }}
              className="w-full h-11 rounded-md border border-border bg-background px-3 text-foreground"
              placeholder="username"
            />
            <p className="mt-1 text-xs text-muted-foreground">3-20 chars, lowercase letters, numbers, underscore</p>
            {usernameStatus === "available" ? <p className="mt-1 text-xs text-green-400">✓ available</p> : null}
            {usernameStatus === "taken" ? <p className="mt-1 text-xs text-red-400">✗ taken</p> : null}
            {usernameStatus === "invalid" ? <p className="mt-1 text-xs text-yellow-400">⚠ invalid format</p> : null}
            {usernameStatus === "checking" ? <p className="mt-1 text-xs text-muted-foreground">Checking availability...</p> : null}
            {normalizedUsername ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Profile URL: <span className="text-foreground">/u/{normalizedUsername}</span>
              </p>
            ) : null}
          </div>

          {inlineError ? <p className="text-sm text-red-400">{inlineError}</p> : null}
          {isSaved ? <p className="text-sm text-green-400">Your profile is ready.</p> : null}

          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting} className="w-full">
            {isSubmitting ? "Saving..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  )
}

