/**
 * Rate-page SEO helpers: malformed URL detection + indexability gate.
 *
 * Indexable when:
 *   communityRatingCount >= MIN_COMMUNITY_RATINGS_FOR_INDEX
 *   && tier !== 'MINOR'
 *   && !malformed
 *
 * Single-rating and seeded-only pages stay live/rateable but are noindex until
 * a second signed community rating lands.
 * MINOR-tier performances stay live/rateable but are noindex.
 */

/** Minimum signed community ratings before a /rate page is indexable. */
export const MIN_COMMUNITY_RATINGS_FOR_INDEX = 2

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
  /** Performance billing tier; MINOR is never indexable. */
  tier: string | null | undefined
}

/**
 * Returns true when the rate page should be indexable (no robots noindex).
 */
export function isRatePageIndexable(input: RatePageIndexabilityInput): boolean {
  if (isMalformedMovieForSeo(input.movieSlug, input.movieTitle)) return false
  if (!input.tier || input.tier === "MINOR") return false
  if (input.communityRatingCount < MIN_COMMUNITY_RATINGS_FOR_INDEX) return false
  return true
}
