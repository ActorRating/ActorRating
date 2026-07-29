"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"

const GOLD =
  "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)"
const HERO_SANS = {
  fontFamily: "var(--font-geist-sans), var(--font-sans), system-ui, sans-serif",
} as const

export function WaitlistForm({
  compact = false,
  anchor = true,
}: {
  compact?: boolean
  /** When false, omit id="waitlist" (hero mounts the form in multiple layouts). */
  anchor?: boolean
}) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [message, setMessage] = useState("")

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus("sending")
    setMessage("")
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        message?: string
        alreadyMember?: boolean
      }
      if (!res.ok) {
        setStatus("error")
        setMessage(data.error || "Could not join waitlist")
        return
      }
      setStatus("done")
      setMessage(
        data.alreadyMember
          ? data.message || "You’re already a member — sign in."
          : "You’re on the list. We’ll email when a spot opens.",
      )
    } catch {
      setStatus("error")
      setMessage("Could not join waitlist")
    }
  }

  return (
    <div
      id={anchor ? "waitlist" : undefined}
      className={
        compact
          ? ""
          : "scroll-mt-28 w-full max-w-[280px] sm:max-w-md mx-auto text-center flex flex-col items-center"
      }
    >
      {!compact ? (
        <div className="mb-4 w-full">
          <h2 className="text-xl font-bold text-white">Join the waitlist</h2>
          <p className="mt-1 text-sm text-zinc-400">
            ActorRating is invite-only. Leave your email, or{" "}
            <Link href="/auth/register" className="text-[#FFD700] hover:underline">
              register with a code
            </Link>
            .
          </p>
        </div>
      ) : null}
      {status === "done" ? (
        <p className="text-sm text-emerald-300">{message}</p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full max-w-[280px] sm:max-w-md mx-auto items-stretch"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="flex-1 min-w-0 rounded border border-white/15 bg-zinc-950 px-4 text-[17px] text-white placeholder:text-zinc-600 text-left min-h-[48px]"
            style={HERO_SANS}
            disabled={status === "sending"}
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="inline-flex shrink-0 items-center justify-center px-6 py-[15px] rounded text-black text-[18px] font-bold leading-none transition-transform hover:scale-[1.02] min-h-[48px] disabled:opacity-60 disabled:hover:scale-100"
            style={{ background: GOLD, ...HERO_SANS }}
          >
            {status === "sending" ? "Joining…" : "Join waitlist"}
          </button>
        </form>
      )}
      {status === "error" ? <p className="mt-2 text-sm text-red-400">{message}</p> : null}
    </div>
  )
}
