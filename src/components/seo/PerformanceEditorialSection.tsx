type EditorialProps = {
  actorName: string
  movieTitle: string
  overview: string
  scoreAnalysis: string
  communityTake: string
  notableMoments: string
}

/**
 * Visible SSR editorial for rate pages (crawlable unique content).
 */
export default function PerformanceEditorialSection({
  actorName,
  movieTitle,
  overview,
  scoreAnalysis,
  communityTake,
  notableMoments,
}: EditorialProps) {
  return (
    <article
      aria-label={`Editorial analysis of ${actorName} in ${movieTitle}`}
      className="mx-auto mt-8 w-full max-w-[900px] space-y-6 px-3 sm:px-6"
    >
      <header className="space-y-1 border-t border-white/[0.06] pt-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          Performance notes
        </p>
        <h2 className="text-lg font-semibold text-zinc-100 sm:text-xl">About this performance</h2>
      </header>

      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold tracking-wide text-[#FFD700]">Overview</h3>
        <p className="text-sm leading-relaxed text-zinc-500">{overview}</p>
      </section>

      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold tracking-wide text-[#FFD700]">
          Why the score looks this way
        </h3>
        <p className="text-sm leading-relaxed text-zinc-500">{scoreAnalysis}</p>
      </section>

      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold tracking-wide text-[#FFD700]">Community consensus</h3>
        <p className="text-sm leading-relaxed text-zinc-500">{communityTake}</p>
      </section>

      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold tracking-wide text-[#FFD700]">
          Notable craft moments
        </h3>
        <p className="text-sm leading-relaxed text-zinc-500">{notableMoments}</p>
      </section>
    </article>
  )
}
