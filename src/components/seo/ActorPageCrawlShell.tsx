import Link from "next/link"
import type { ActorCrawlShellEntry } from "@/lib/actor-page-data"

type Props = {
  actorName: string
  intro?: string | null
  totalRatingCount: number
  entries: ActorCrawlShellEntry[]
  cappedFrom?: number
  /** Allowlisted hub path derived from already-loaded filmography (no extra queries). */
  hubPath?: string | null
}

/**
 * SSR crawlable filmography summary for actor pages.
 * Placed below the interactive client UI so the visual layout stays intact.
 */
export default function ActorPageCrawlShell({
  actorName,
  intro,
  totalRatingCount,
  entries,
  cappedFrom,
  hubPath,
}: Props) {
  const ratedEntries = entries.filter((e) => e.ratingCount > 0)
  const topRated = ratedEntries[0]
  const performancesListed = cappedFrom && cappedFrom > 0 ? cappedFrom : entries.length
  const answerSentence =
    topRated && totalRatingCount > 0
      ? `${actorName} has ${performancesListed} performances listed; ${ratedEntries.length} have community ratings. Highest community-rated: ${topRated.character ? `${topRated.character} in ${topRated.movieTitle}` : topRated.movieTitle} (${topRated.scoreLabel}, ${topRated.ratingCount} ${topRated.ratingCount === 1 ? "rating" : "ratings"}).`
      : null

  const factualIntro =
    intro?.trim() ||
    (totalRatingCount > 0
      ? `${actorName} has ${totalRatingCount} community ${
          totalRatingCount === 1 ? "rating" : "ratings"
        } on ActorRating. Rankings below use those scores — acting craft, not overall film quality.`
      : `${actorName} is on ActorRating. Rate their performances across five craft criteria: Emotional Range & Depth, Character Believability, Technical Skill, Screen Presence, and Chemistry.`)

  return (
    <section
      aria-label="Actor filmography overview"
      className="mx-auto mt-10 w-full max-w-[900px] space-y-4 px-3 pb-12 sm:px-6"
    >
      <div className="space-y-1 border-t border-white/[0.06] pt-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          Filmography
        </p>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
          {actorName} performances ranked &amp; rated
        </h1>
      </div>
      {answerSentence ? (
        <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-zinc-300">
          {answerSentence}
        </p>
      ) : null}
      <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-zinc-500">
        {factualIntro}
      </p>
      {hubPath ? (
        <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-zinc-400">
          <Link href={hubPath} className="text-[#FFD700] underline-offset-2 hover:underline">
            See the community ranking of performances in this film
          </Link>
        </p>
      ) : null}
      {entries.length > 0 ? (
        <ol className="mx-auto max-w-2xl list-decimal space-y-2 pl-5 text-left text-sm text-zinc-400">
          {entries.map((entry) => (
            <li key={entry.rateHref} className="leading-relaxed">
              <Link
                href={entry.movieHref}
                className="text-zinc-200 transition hover:text-[#FFD700]"
              >
                {entry.movieTitle} ({entry.movieYear})
              </Link>
              {entry.character ? (
                <span className="text-zinc-500"> as {entry.character}</span>
              ) : null}
              {" — "}
              <Link
                href={entry.rateHref}
                className="text-zinc-300 transition hover:text-[#FFD700]"
              >
                Rate this performance
              </Link>
              {": "}
              <span className="text-zinc-200">{entry.scoreLabel}</span>
              {entry.ratingCount > 0 ? (
                <span className="text-zinc-600">
                  {" "}
                  ({entry.ratingCount}{" "}
                  {entry.ratingCount === 1 ? "rating" : "ratings"})
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-center text-sm text-zinc-500">
          No rateable filmography listed yet.
        </p>
      )}
      {typeof cappedFrom === "number" && cappedFrom > entries.length ? (
        <p className="text-center text-xs text-zinc-600">
          Showing {entries.length} of {cappedFrom} performances.
        </p>
      ) : null}
    </section>
  )
}
