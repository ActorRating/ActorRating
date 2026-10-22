/**
 * Movie-only AggregateRating for JSON-LD.
 * Never attach to Person (Search Console "invalid object type").
 * Skip thin samples (n < MIN) so a single rating is not presented as an aggregate.
 */

export const MIN_AGGREGATE_RATING_COUNT = 3

export type MovieAggregateRatingInput = {
  /** Community score on a 0–10 scale (already divided from 0–100 storage). */
  ratingValue10: number | null | undefined
  ratingCount: number
}

/**
 * Returns an AggregateRating node, or null when the parent must omit it.
 */
export function buildMovieAggregateRating(
  input: MovieAggregateRatingInput,
): Record<string, unknown> | null {
  const count = input.ratingCount
  if (!Number.isFinite(count) || count < MIN_AGGREGATE_RATING_COUNT) return null
  const value = input.ratingValue10
  if (value == null || !Number.isFinite(value) || !(value > 0)) return null
  return {
    "@type": "AggregateRating",
    ratingValue: String(Number(value.toFixed(1))),
    ratingCount: String(Math.floor(count)),
    bestRating: 10,
    worstRating: 0,
  }
}

/** True when a JSON-LD tree contains aggregateRating under a Person node. */
export function personNodeHasAggregateRating(node: unknown): boolean {
  if (!node || typeof node !== "object") return false
  const obj = node as Record<string, unknown>
  if (obj["@type"] === "Person" && obj.aggregateRating != null) return true
  if (Array.isArray(obj["@graph"])) {
    return obj["@graph"].some((n) => personNodeHasAggregateRating(n))
  }
  return false
}
