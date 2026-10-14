"use client"

const DISPLAY = {
  fontFamily: 'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
} as const

export function LoadingState() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-8 w-full max-w-5xl mx-auto" aria-busy="true" aria-live="polite">
      {[0, 1].map((key) => (
        <div key={key} className="animate-pulse">
          <div className="aspect-[2/3] rounded-md bg-white/[0.06] border border-white/10" />
          <div className="mt-3 h-4 w-2/3 mx-auto rounded bg-white/[0.06]" />
          <div className="mt-2 h-3 w-1/2 mx-auto rounded bg-white/[0.04]" />
        </div>
      ))}
      <p className="col-span-2 text-center text-sm text-zinc-500">Loading a matchup</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="max-w-md mx-auto text-center px-6 py-16">
      <h2 className="text-3xl text-white" style={DISPLAY}>Something interrupted the matchup.</h2>
      <p className="mt-3 text-zinc-400 text-sm leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 px-5 py-2.5 text-sm font-semibold text-white hover:border-[#FFD700]/50 hover:text-[#FFD700]"
      >
        Try again
      </button>
    </div>
  )
}

export function EmptyState({ message, onSwitch }: { message: string; onSwitch: () => void }) {
  return (
    <div className="max-w-md mx-auto text-center px-6 py-16">
      <h2 className="text-3xl text-white" style={DISPLAY}>This mode needs a deeper bench.</h2>
      <p className="mt-3 text-zinc-400 text-sm leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={onSwitch}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-bold text-black"
        style={{ background: "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)" }}
      >
        Try mixed matchups
      </button>
    </div>
  )
}

export { DISPLAY }
