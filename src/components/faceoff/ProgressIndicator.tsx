"use client"

export function ProgressIndicator({ choiceCount }: { choiceCount: number }) {
  const step = choiceCount % 5
  const label = String(step).padStart(2, "0")
  return (
    <div className="flex items-center gap-2" aria-label={`Progress ${label} of 05`}>
      <span className="text-[11px] tracking-[0.16em] text-zinc-400 tabular-nums">{label} / 05</span>
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={`h-1 w-3 rounded-full transition-colors duration-200 motion-reduce:transition-none ${index < step ? "bg-[#FFD700]" : "bg-white/15"}`}
          />
        ))}
      </span>
    </div>
  )
}
