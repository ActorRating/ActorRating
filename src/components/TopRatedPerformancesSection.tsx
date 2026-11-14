import Link from "next/link"
import {
  getTopRatedPerformancesBySignedIn,
  type TopRatedPerformanceLink,
} from "@/lib/top-rated-community"
import { hubBestPerformancesPath } from "@/lib/movie-best-performances/hub-allowlist"
import { isStaticProductionBuild } from "@/lib/is-static-build"

const DISPLAY: React.CSSProperties = {
  fontFamily:
    'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
}

function scoreLabel(row: TopRatedPerformanceLink): string | null {
  if (row.avgScore10 == null || row.signedInCount <= 0) return null
  const ratingWord = row.signedInCount === 1 ? "rating" : "ratings"
  return `${row.avgScore10}/10 · ${row.signedInCount} signed-in ${ratingWord}`
}

function PerformanceList({
  rows,
  compact,
}: {
  rows: TopRatedPerformanceLink[]
  compact?: boolean
}) {
  return (
    <ul className={compact ? "space-y-2 text-sm text-zinc-300" : "space-y-2.5 text-sm sm:text-[15px] text-zinc-300"}>
      {rows.map((row) => {
        const meta = scoreLabel(row)
        const label = row.character?.trim()
          ? `${row.actorName} as ${row.character} in ${row.movieTitle}`
          : `${row.actorName} in ${row.movieTitle}`
        return (
          <li key={`${row.actorId}:${row.movieId}`} className="leading-snug">
            <Link
              href={row.href}
              className="text-zinc-200 hover:text-[#FFD700] transition-colors"
            >
              {label}
              {row.movieYear ? (
                <span className="text-zinc-500"> ({row.movieYear})</span>
              ) : null}
            </Link>
            {meta ? (
              <span className="block text-xs text-zinc-500 mt-0.5 tabular-nums">
                {meta}
              </span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

/** Discover: longer top-rated list. Throws on DB failure (caller must not swallow). */
export async function DiscoverTopRatedPerformancesSection() {
  if (isStaticProductionBuild()) return null
  const rows = await getTopRatedPerformancesBySignedIn({
    limit: 24,
    indexableOnly: true,
  })
  if (!rows.length) return null

  return (
    <section
      className="px-5 sm:px-8 lg:px-10 pb-12 sm:pb-16"
      aria-labelledby="discover-top-rated-heading"
    >
      <div className="max-w-3xl mx-auto">
        <h2
          id="discover-top-rated-heading"
          className="text-xl sm:text-2xl font-semibold text-white tracking-tight mb-2"
          style={DISPLAY}
        >
          Top rated performances
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          Ranked by signed-in community ratings. Scores shown only when ratings exist.
        </p>
        <PerformanceList rows={rows} />
        <p className="mt-6 text-sm text-zinc-500">
          <Link href="/methodology" className="hover:text-[#FFD700] transition-colors underline-offset-4 hover:underline">
            How scores are calculated
          </Link>
        </p>
      </div>
    </section>
  )
}

/**
 * Homepage: ~8 crawlable links (hub, methodology, top performances).
 * Throws on DB failure.
 */
export async function HomeTopRatedLinksSection() {
  if (isStaticProductionBuild()) return null
  const hubPath = hubBestPerformancesPath("the-odyssey-2026")
  const rows = await getTopRatedPerformancesBySignedIn({
    limit: 6,
    indexableOnly: true,
  })

  return (
    <section
      className="bg-black border-t border-white/10"
      aria-labelledby="home-top-rated-heading"
    >
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <h2
          id="home-top-rated-heading"
          className="text-sm font-semibold tracking-[0.2em] uppercase text-zinc-400 mb-4"
        >
          Top rated performances
        </h2>
        <ul className="space-y-2 text-sm text-zinc-300 mb-6">
          {hubPath ? (
            <li>
              <Link
                href={hubPath}
                className="hover:text-[#FFD700] transition-colors"
              >
                Community ranking for The Odyssey (2026)
              </Link>
            </li>
          ) : null}
          <li>
            <Link
              href="/methodology"
              className="hover:text-[#FFD700] transition-colors"
            >
              How ActorRating scores work
            </Link>
          </li>
        </ul>
        {rows.length > 0 ? <PerformanceList rows={rows} compact /> : null}
        <p className="mt-6 text-sm text-zinc-500">
          <Link
            href="/discover"
            className="hover:text-[#FFD700] transition-colors underline underline-offset-4 decoration-zinc-700 hover:decoration-[#FFD700]/50"
          >
            Browse top-rated performances →
          </Link>
        </p>
      </div>
    </section>
  )
}
