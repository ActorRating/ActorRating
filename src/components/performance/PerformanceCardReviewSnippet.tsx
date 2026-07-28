"use client"

/** Short review quote on actor/movie performance cards. */
export function PerformanceCardReviewSnippet({
  comment,
  attribution,
  isYours = false,
}: {
  comment: string
  attribution?: string | null
  isYours?: boolean
}) {
  const text = comment.trim()
  if (!text) return null
  const clipped = text.length > 140 ? `${text.slice(0, 137)}…` : text

  return (
    <blockquote className="mb-5 rounded-md border border-white/[0.08] bg-black/40 px-3.5 py-3">
      {isYours ? (
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#FFD700]/70">
          Your review
        </p>
      ) : attribution ? (
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          {attribution}
        </p>
      ) : null}
      <p className="text-sm leading-relaxed text-zinc-300 italic">
        &ldquo;{clipped}&rdquo;
      </p>
    </blockquote>
  )
}
