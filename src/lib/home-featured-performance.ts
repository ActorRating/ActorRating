import type { EnrichedPerformance } from '@/lib/performances-by-lookup'
import { getRateUrl } from '@/lib/slugHelper'
import { createActorSlug, createMovieSlug } from '@/lib/createSlug'

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

/** Fixed landing hero — change this when you want a new featured still. */
export const FIXED_LANDING_HERO = {
  actor: 'Matt Damon',
  movie: 'The Odyssey',
  year: 2026,
  headline: 'How do you rate Matt Damon in The Odyssey?',
  subline:
    'One quick score—or five Oscar-inspired dimensions: emotional range, believability, technical skill, screen presence, and chemistry.',
  /** Wide cinematic still (not the vertical poster) */
  backdropUrl: 'https://image.tmdb.org/t/p/w1920/twiVn9oFXOVR0uoYgawyEBlnFu8.jpg',
} as const

export function fixedLandingHeroLookupTarget(): {
  actor: string
  movie: string
  year: number
} {
  return {
    actor: FIXED_LANDING_HERO.actor,
    movie: FIXED_LANDING_HERO.movie,
    year: FIXED_LANDING_HERO.year,
  }
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

/** Fixed Odyssey landing hero (not weekly rotation). */
export function buildFixedLandingHero(
  perf: EnrichedPerformance | null | undefined,
): FeaturedHeroPayload {
  const copy = {
    headline: FIXED_LANDING_HERO.headline,
    subline: FIXED_LANDING_HERO.subline,
  }
  const base = perf ? enrichedToFeaturedPayload(perf, copy) : null
  if (base) {
    return { ...base, moviePosterUrl: FIXED_LANDING_HERO.backdropUrl }
  }
  return {
    rateHref: getRateUrl(
      {
        id: createActorSlug(FIXED_LANDING_HERO.actor),
        name: FIXED_LANDING_HERO.actor,
        slug: createActorSlug(FIXED_LANDING_HERO.actor),
      },
      {
        id: createMovieSlug(FIXED_LANDING_HERO.movie, FIXED_LANDING_HERO.year),
        title: FIXED_LANDING_HERO.movie,
        year: FIXED_LANDING_HERO.year,
        slug: createMovieSlug(FIXED_LANDING_HERO.movie, FIXED_LANDING_HERO.year),
      },
    ),
    actorName: FIXED_LANDING_HERO.actor,
    movieTitle: FIXED_LANDING_HERO.movie,
    year: String(FIXED_LANDING_HERO.year),
    communityScore: null,
    actorImageUrl: null,
    moviePosterUrl: FIXED_LANDING_HERO.backdropUrl,
    headline: FIXED_LANDING_HERO.headline,
    subline: FIXED_LANDING_HERO.subline,
  }
}

/** @deprecated Use buildFixedLandingHero — kept for older call sites */
export function buildWeeklyFeaturedHero(
  _config: { actor: string; movie: string; year: string; headline: string; subline: string },
  perf: EnrichedPerformance | null | undefined,
): FeaturedHeroPayload {
  return buildFixedLandingHero(perf)
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
