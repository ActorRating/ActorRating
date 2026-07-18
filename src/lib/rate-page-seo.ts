/**
 * Rate-page SEO helpers: malformed URL detection + indexability gate.
 *
 * Indexable when: (seeded || community) && cohort === 1 && !malformed
 * Outside cohort-1 stays noindex during the phased SEO recovery.
 */

/** Slugs like "-2019" or "-2019-abc123" from empty titles. */
const MALFORMED_MOVIE_SLUG_RE = /^-\d{4}(-[a-z0-9]+)?$/i

export function isMalformedMovieForSeo(
  slug: string | null | undefined,
  title: string | null | undefined,
): boolean {
  const t = (title ?? "").trim()
  if (!t) return true
  const s = (slug ?? "").trim()
  if (!s) return false
  return MALFORMED_MOVIE_SLUG_RE.test(s)
}

export type RatePageIndexabilityInput = {
  movieSlug: string | null | undefined
  movieTitle: string | null | undefined
  indexingCohort: number | null | undefined
  seededAggregateScore: number | null | undefined
  communityRatingCount: number
}

/**
 * Returns true when the rate page should be indexable (no robots noindex).
 */
export function isRatePageIndexable(input: RatePageIndexabilityInput): boolean {
  if (isMalformedMovieForSeo(input.movieSlug, input.movieTitle)) return false
  if ((input.indexingCohort ?? 0) !== 1) return false

  const hasCommunity = input.communityRatingCount >= 1
  const hasSeeded =
    typeof input.seededAggregateScore === "number" && Number.isFinite(input.seededAggregateScore)
  return hasSeeded || hasCommunity
}
