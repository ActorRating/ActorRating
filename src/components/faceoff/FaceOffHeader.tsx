"use client"

import Link from "next/link"
import { ModeSelector } from "@/components/faceoff/ModeSelector"
import { ProgressIndicator } from "@/components/faceoff/ProgressIndicator"
import type { FaceOffModeName } from "@/lib/faceoff/constants"

export function FaceOffHeader({
  mode,
  choiceCount,
  disabled,
  onMode,
}: {
  mode: FaceOffModeName
  choiceCount: number
  disabled?: boolean
  onMode: (mode: FaceOffModeName) => void
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-black/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/" className="text-sm font-semibold tracking-tight text-white">
            ActorRating
          </Link>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#FFD700]/80">Face-Off</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <ProgressIndicator choiceCount={choiceCount} />
          <ModeSelector mode={mode} disabled={disabled} onChange={onMode} />
          <Link href="/faceoff/leaderboard" className="hidden md:inline text-xs text-zinc-400 hover:text-[#FFD700]">
            Rankings
          </Link>
        </div>
      </div>
    </header>
  )
}
