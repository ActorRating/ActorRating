"use client"

import type { FaceOffModeName } from "@/lib/faceoff/constants"

const OPTIONS: Array<{ id: FaceOffModeName; label: string }> = [
  { id: "performance", label: "Performances" },
  { id: "actor", label: "Actors" },
  { id: "mixed", label: "Mixed" },
]

export function ModeSelector({
  mode,
  disabled,
  onChange,
}: {
  mode: FaceOffModeName
  disabled?: boolean
  onChange: (mode: FaceOffModeName) => void
}) {
  return (
    <div className="flex rounded-md border border-white/10 p-0.5" role="group" aria-label="Face-Off mode">
      {OPTIONS.map((option) => {
        const active = option.id === mode
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-[5px] min-h-8 ${
              active ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            } disabled:opacity-50`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
