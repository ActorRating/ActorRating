"use client"

import { useState } from "react"
import { trackFaceOff } from "@/lib/analytics"

export function ShareButton({
  leftId,
  rightId,
  disabled,
}: {
  leftId: string
  rightId: string
  disabled?: boolean
}) {
  const [label, setLabel] = useState("Share")
  async function share() {
    try {
      const res = await fetch("/api/faceoff/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ leftId, rightId }),
      })
      if (!res.ok) {
        setLabel("Share unavailable")
        return
      }
      const data = await res.json()
      const url = new URL(data.path, window.location.origin).toString()
      const text = data.message || "Which performance wins? Make your pick on ActorRating."
      trackFaceOff("faceoff_shared", { mode: data.mode ?? null }, `share:${data.publicId}`)
      if (navigator.share) {
        await navigator.share({ title: data.question, text, url })
        setLabel("Shared")
        return
      }
      await navigator.clipboard.writeText(`${text} ${url}`)
      setLabel("Link copied")
    } catch {
      setLabel("Share unavailable")
    }
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void share()}
      aria-label="Share this matchup"
      className="flex min-h-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] px-2 text-xs font-semibold text-zinc-300 hover:border-[#FFD700]/40 hover:text-[#FFD700] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD700] disabled:opacity-40"
    >
      {label}
    </button>
  )
}
