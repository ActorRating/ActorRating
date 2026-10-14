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
  const button =
    "flex min-h-11 min-w-0 items-center justify-center overflow-hidden rounded-md border border-[#FFD700]/40 bg-[#FFD700]/10 px-2 text-sm font-semibold text-[#FFE9A0] hover:bg-[#FFD700]/18 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD700] active:scale-[0.98] disabled:opacity-40 motion-reduce:active:scale-100"
  return (
    <div className="mx-auto w-full max-w-[460px] sm:max-w-[520px]">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={disabled} onClick={onLeft} aria-label={`Choose ${leftName}`} className={button}>
          <span className="min-w-0 text-center leading-tight">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FFD700]/70">Choose</span>
            <span className="block truncate">{leftName}</span>
          </span>
        </button>
        <button type="button" disabled={disabled} onClick={onRight} aria-label={`Choose ${rightName}`} className={button}>
          <span className="min-w-0 text-center leading-tight">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FFD700]/70">Choose</span>
            <span className="block truncate">{rightName}</span>
          </span>
        </button>
      </div>
    </div>
  )
}
