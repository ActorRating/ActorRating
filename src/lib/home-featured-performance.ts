import type { EnrichedPerformance } from '@/lib/performances-by-lookup'
import { getRateUrl } from '@/lib/slugHelper'
import type { WeeklyHeroConfig } from '@/lib/weekly-hero-performance'

/** Serializable props for hero + conversion CTAs (server or client). */
export type FeaturedHeroPayload = {
  rateHref: string
  actorName: string
  movieTitle: string
  year: string
  communityScore: string | null
  actorImageUrl?: string | null
  moviePosterUrl?: string | null
  headline: string
  subline: string
}

export function enrichedToFeaturedPayload(
  p: EnrichedPerformance,
  copy?: Pick<FeaturedHeroPayload, 'headline' | 'subline'>,
): FeaturedHeroPayload | null {
  if (!p?.actor || !p?.movie) return null
  const avg = p.averageRating
  const cnt = p.ratingCount ?? 0
  const communityScore = avg != null && avg > 0 && cnt > 0 ? (avg / 10).toFixed(1) : null
  const actorName = p.actor.name
  const movieTitle = p.movie.title
  return {
    rateHref: getRateUrl(
      { id: p.actorId, name: p.actor.name, slug: p.actor.slug },
      { id: p.movieId, title: p.movie.title, year: p.movie.year, slug: p.movie.slug },
    ),
    actorName,
    movieTitle,
    year: String(p.movie.year),
    communityScore,
    actorImageUrl: p.actor.imageUrl,
    moviePosterUrl: p.movie.posterUrl,
    headline: copy?.headline ?? `How do you rate ${actorName} in ${movieTitle}?`,
    subline:
      copy?.subline ??
      'One quick score—or five Oscar-inspired dimensions: emotional range, believability, technical skill, screen presence, and chemistry.',
  }
}

/** Merge weekly copy with lookup row (hero + nav Rate Now). */
export function buildWeeklyFeaturedHero(
  config: WeeklyHeroConfig,
  perf: EnrichedPerformance | null | undefined,
): FeaturedHeroPayload {
  const base = perf ? enrichedToFeaturedPayload(perf, config) : null
  if (base) return base
  return {
    rateHref: '/performances',
    actorName: config.actor,
    movieTitle: config.movie,
    year: config.year,
    communityScore: null,
    actorImageUrl: null,
    moviePosterUrl: null,
    headline: config.headline,
    subline: config.subline,
  }
}

/** Pick highest community-rated performance from lookup results (legacy fallback). */
export function featuredHeroFromPerformances(perfs: EnrichedPerformance[]): FeaturedHeroPayload | null {
  if (!perfs.length) return null
  const sorted = [...perfs].sort((a, b) => (Number(b.averageRating) || 0) - (Number(a.averageRating) || 0))
  const base = enrichedToFeaturedPayload(sorted[0])
  if (!base) return null
  return {
    ...base,
    headline: `How do you rate ${base.actorName} in ${base.movieTitle}?`,
    subline:
      'One quick score—or five Oscar-inspired dimensions: emotional range, believability, technical skill, screen presence, and chemistry.',
  }
}
