/**
 * Rate-page SEO helpers: malformed URL detection + indexability gate.
 *
 * Indexable when:
 *   (seeded || community)
 *   && (cohort === 1 || hasRealCommunityRating)
 *   && tier !== 'MINOR'
 *   && !malformed
 *
 * Community-rated pages stay indexable regardless of cohort.
 * Cohort-1 only gates the seeded-score pathway.
 * MINOR-tier performances stay live/rateable but are noindex.
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
  /** Performance billing tier; MINOR is never indexable. */
  tier: string | null | undefined
}

/**
 * Returns true when the rate page should be indexable (no robots noindex).
 */
export function isRatePageIndexable(input: RatePageIndexabilityInput): boolean {
  if (isMalformedMovieForSeo(input.movieSlug, input.movieTitle)) return false
  if (!input.tier || input.tier === "MINOR") return false

  const hasCommunity = input.communityRatingCount >= 1
  const hasSeeded =
    typeof input.seededAggregateScore === "number" && Number.isFinite(input.seededAggregateScore)

  if (!(hasSeeded || hasCommunity)) return false
  if (!((input.indexingCohort ?? 0) === 1 || hasCommunity)) return false
  return true
}
