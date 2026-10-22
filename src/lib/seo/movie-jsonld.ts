import { buildMovieAggregateRating } from "@/lib/seo/aggregate-rating-jsonld"

type MovieJsonLdPerformance = {
  actor?: { name?: string | null; slug?: string | null; id?: string } | null
}

type MovieJsonLdData = {
  id?: string
  slug?: string | null
  title?: string | null
  year?: number | null
  performances?: MovieJsonLdPerformance[] | null
  ratings?: Array<{ weightedScore?: number | null }> | null
  totalRatingCount?: number | null
  aggregateWeightedScore?: number | null
}

export function buildMovieJsonLd(
  data: MovieJsonLdData,
  baseUrl: string,
): Record<string, unknown> {
  const base = baseUrl.replace(/\/$/, "")
  const movieUrl = `${base}/movies/${data.slug || data.id}`

  const actor =
    Array.isArray(data.performances) &&
    data.performances
      .filter((p) => p?.actor?.name)
      .map((p) => ({
        "@type": "Person" as const,
        name: p.actor!.name!,
        url: `${base}/actors/${p.actor!.slug || p.actor!.id}`,
      }))

  const ratings = data.ratings || []
  const ratingCount =
    typeof data.totalRatingCount === "number"
      ? data.totalRatingCount
      : ratings.length
  const aggregateFromApi =
    typeof data.aggregateWeightedScore === "number"
      ? data.aggregateWeightedScore
      : null
  const hasScores =
    aggregateFromApi != null || ratings.some((r) => r.weightedScore != null)
  const avg100 =
    aggregateFromApi != null
      ? aggregateFromApi
      : hasScores && ratingCount >= 1
        ? ratings.reduce(
            (sum, r) => sum + (Number(r.weightedScore) || 0),
            0,
          ) / ratingCount
        : null
  const ratingValue10 =
    avg100 != null && avg100 > 0 ? Number((avg100 / 10).toFixed(1)) : null

  const aggregateRating = buildMovieAggregateRating({
    ratingValue10,
    ratingCount,
  })

  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: data.title,
    url: movieUrl,
    ...(data.year && { datePublished: String(data.year) }),
    ...(Array.isArray(actor) && actor.length > 0 && { actor }),
    ...(aggregateRating ? { aggregateRating } : {}),
  }
}
