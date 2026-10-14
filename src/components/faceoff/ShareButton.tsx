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
  const [label, setLabel] = useState("Share matchup")
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
      className="text-sm text-zinc-400 underline-offset-4 hover:text-[#FFD700] hover:underline disabled:opacity-50"
    >
      {label}
    </button>
  )
}
