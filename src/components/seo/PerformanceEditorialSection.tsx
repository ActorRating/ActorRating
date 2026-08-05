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
      className="mx-auto mt-10 w-full max-w-[900px] space-y-6 px-3 sm:px-6"
    >
      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          Performance notes
        </p>
        <h2 className="text-xl font-semibold text-white">About this performance</h2>
        <p className="text-sm text-zinc-500">
          Craft analysis for {actorName} in {movieTitle}.
        </p>
      </header>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-200">Overview</h3>
        <p className="text-sm leading-relaxed text-zinc-400">{overview}</p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-200">Why the score looks this way</h3>
        <p className="text-sm leading-relaxed text-zinc-400">{scoreAnalysis}</p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-200">Community consensus</h3>
        <p className="text-sm leading-relaxed text-zinc-400">{communityTake}</p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-200">Notable craft moments</h3>
        <p className="text-sm leading-relaxed text-zinc-400">{notableMoments}</p>
        <p className="text-xs text-zinc-600">Spoiler-safe — focused on craft, not plot.</p>
      </section>
    </article>
  )
}
