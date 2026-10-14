"use client"

export function SwipeControls({
  leftName,
  rightName,
  disabled,
  onLeft,
  onRight,
}: {
  leftName: string
  rightName: string
  disabled?: boolean
  onLeft: () => void
  onRight: () => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-5xl mx-auto">
      <button
        type="button"
        disabled={disabled}
        onClick={onLeft}
        aria-label={`Choose ${leftName}`}
        className="min-h-11 rounded-md border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm font-semibold text-white hover:border-[#FFD700]/40 disabled:opacity-50"
      >
        Choose {leftName}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onRight}
        aria-label={`Choose ${rightName}`}
        className="min-h-11 rounded-md border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm font-semibold text-white hover:border-[#FFD700]/40 disabled:opacity-50"
      >
        Choose {rightName}
      </button>
    </div>
  )
}
