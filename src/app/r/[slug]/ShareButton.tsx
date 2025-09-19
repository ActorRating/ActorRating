"use client"
import React from "react"
import { Share2 } from "lucide-react"

export function ShareButton({
  actorName,
  movieTitle,
  roleName,
  pageUrl,
}: {
  actorName: string
  movieTitle: string
  roleName?: string | null
  pageUrl: string
}) {
  async function onShare() {
    const text = `I rated ${actorName} in ${movieTitle}${roleName ? ` as ${roleName}` : ""} on ActorRating.com`
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ title: "ActorRating", text, url: pageUrl })
      } else {
        await navigator.clipboard.writeText(pageUrl)
        alert("Link copied to clipboard")
      }
    } catch {
      await navigator.clipboard.writeText(pageUrl)
      alert("Link copied to clipboard")
    }
  }

  return (
    <button
      onClick={onShare}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.6)] hover:shadow-[0_0_18px_rgba(217,70,239,0.8)] transition-shadow"
      aria-label="Share rating"
    >
      <Share2 className="w-4 h-4" />
      <span>Share</span>
    </button>
  )
}


