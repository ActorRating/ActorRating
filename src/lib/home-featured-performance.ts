import type { EnrichedPerformance } from '@/lib/performances-by-lookup'
import { getRateUrl } from '@/lib/slugHelper'

/** Serializable props for hero + conversion CTAs (server or client). */
export type FeaturedHeroPayload = {
  rateHref: string
  actorName: string
  movieTitle: string
  year: string
  communityScore: string | null
  actorImageUrl?: string | null
  moviePosterUrl?: string | null
}

export function enrichedToFeaturedPayload(p: EnrichedPerformance): FeaturedHeroPayload | null {
  if (!p?.actor || !p?.movie) return null
  const avg = p.averageRating
  const cnt = p.ratingCount ?? 0
  const communityScore = avg != null && avg > 0 && cnt > 0 ? (avg / 10).toFixed(1) : null
  return {
    rateHref: getRateUrl(
      { id: p.actorId, name: p.actor.name, slug: p.actor.slug },
      { id: p.movieId, title: p.movie.title, year: p.movie.year, slug: p.movie.slug },
    ),
    actorName: p.actor.name,
    movieTitle: p.movie.title,
    year: String(p.movie.year),
    communityScore,
    actorImageUrl: p.actor.imageUrl,
    moviePosterUrl: p.movie.posterUrl,
  }
}

/** Pick highest community-rated performance from lookup results for the hero spotlight. */
export function featuredHeroFromPerformances(perfs: EnrichedPerformance[]): FeaturedHeroPayload | null {
  if (!perfs.length) return null
  const sorted = [...perfs].sort((a, b) => (Number(b.averageRating) || 0) - (Number(a.averageRating) || 0))
  return enrichedToFeaturedPayload(sorted[0])
}
