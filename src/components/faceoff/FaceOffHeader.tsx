"use client"

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
    <div className="shrink-0 border-b border-white/[0.06] bg-black">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-3 py-1.5 sm:px-4">
        <ProgressIndicator choiceCount={choiceCount} />
        <ModeSelector mode={mode} disabled={disabled} onChange={onMode} />
      </div>
    </div>
  )
}
