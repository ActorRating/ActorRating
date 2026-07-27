"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"

export function WaitlistForm({ compact = false }: { compact?: boolean }) {
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
    <div id="waitlist" className={compact ? "" : "scroll-mt-24"}>
      {!compact ? (
        <div className="mb-4">
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
        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-md">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="flex-1 rounded-sm border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600"
            disabled={status === "sending"}
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-sm px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-black disabled:opacity-60"
            style={{ background: "linear-gradient(90deg, #FFD700, #FFA500)" }}
          >
            {status === "sending" ? "Joining…" : "Join waitlist"}
          </button>
        </form>
      )}
      {status === "error" ? <p className="mt-2 text-sm text-red-400">{message}</p> : null}
    </div>
  )
}
