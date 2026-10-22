import type { RankedPerformance } from "@/lib/movie-best-performances/ranking"

/**
 * Two-sentence answer-first blurb for best-performances hubs.
 * Uses only real hub fields — no invented scores.
 */
export function buildHubAnswerFirst(input: {
  movieTitle: string
  year: number | null
  totalSignedInRatings: number
  top: RankedPerformance | null
  asOf: Date
}): { summary: string; asOfLabel: string; sourceLine: string } {
  const yearPart = input.year ? ` (${input.year})` : ""
  const asOfLabel = input.asOf.toISOString().slice(0, 10)
  const n = input.totalSignedInRatings
  const ratingWord = n === 1 ? "rating" : "ratings"

  let summary: string
  if (!input.top || n <= 0 || input.top.count <= 0 || input.top.avg10 == null) {
    summary = `No signed-in community ratings yet for performances in ${input.movieTitle}${yearPart}. Be the first to rate a role on ActorRating.`
  } else {
    const role = input.top.character?.trim()
      ? `${input.top.actorName} as ${input.top.character.trim()}`
      : input.top.actorName
    const score = input.top.avg10.toFixed(1)
    summary = `As of ${asOfLabel}, the top-ranked role in ${input.movieTitle}${yearPart} on ActorRating is ${role} at ${score}/10 from ${input.top.count} signed-in ${input.top.count === 1 ? "rating" : "ratings"}. The hub reflects ${n} signed-in community ${ratingWord} across the cast.`
  }

  const sourceLine = `Source: ActorRating community ratings, ${n} signed-in ${ratingWord} as of ${asOfLabel}. Methodology: /methodology`

  return { summary, asOfLabel, sourceLine }
}
