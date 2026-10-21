/**
 * Shared actor page payload loader used by GET /api/actors/[id] and
 * /actors/[id] SSR. Keep response shape stable for the client UI.
 */

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { pickBetterCharacter, hasUsableCharacter } from "@/lib/hydrate-performance-billing"
import { isNonRateablePerformance, matchesFeaturetteTitle } from "@/lib/non-rateable"

const actorApiMovieSelect = {
  id: true,
  title: true,
  year: true,
  director: true,
  tmdbId: true,
  slug: true,
  posterUrl: true,
  isFeaturette: true,
  releaseDate: true,
} as Prisma.MovieSelect

const SYSTEM_USER_ID = "uuid-from-auth-users"

const criteriaKeys = [
  "emotionalRangeDepth",
  "characterBelievability",
  "technicalSkill",
  "screenPresence",
  "chemistryInteraction",
] as const

export type ActorPagePerformance = {
  id: string
  userId: string | null
  actorId: string
  movieId: string
  comment: string | null
  character: string | null
  seededAggregateScore: number | null
  createdAt: Date | string
  updatedAt: Date | string
  movie: {
    id: string
    title: string
    year: number
    director: string | null
    tmdbId: number | null
    slug: string | null
    posterUrl: string | null
    isFeaturette: boolean
    releaseDate: Date | string | null
  } | null
  actor: {
    id: string
    name: string
    slug: string | null
    imageUrl?: string | null
  }
  roleName: string | null
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
  ratingCount: number
  scoreVariance: number
  featuredReview: { comment: string; displayName: string } | null
  user: { name: string; email: string }
}

export type ActorPageData = {
  id: string
  name: string
  bio: string | null
  imageUrl: string | null
  birthDate: Date | string | null
  nationality: string | null
  knownFor: string | null
  slug: string | null
  tmdbId: number | null
  createdAt: Date | string
  updatedAt: Date | string
  performances: ActorPagePerformance[]
  totalRatingCount: number
  aggregateWeightedScore: number | null
  careerCriteriaAverages: Array<{ key: (typeof criteriaKeys)[number]; avg: number }>
}

export type ActorPageMinimal = {
  id: string
  name: string
  imageUrl: string | null
  slug: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

/**
 * Load actor by slug, then id. Returns null when not found.
 * Throws on database / unexpected errors so callers can surface a real failure
 * instead of a thin 200 shell.
 */
export async function loadActorPageData(
  idOrSlug: string,
  options: { minimal?: boolean } = {}
): Promise<ActorPageData | ActorPageMinimal | null> {
  let actor = await prisma.actor.findFirst({ where: { slug: idOrSlug } })
  if (!actor) {
    actor = await prisma.actor.findUnique({ where: { id: idOrSlug } })
  }
  if (!actor) return null

  if (options.minimal) {
    return {
      id: actor.id,
      name: actor.name,
      imageUrl: actor.imageUrl,
      slug: actor.slug,
      createdAt: actor.createdAt,
      updatedAt: actor.updatedAt,
    }
  }

  const [performances, ratings] = await Promise.all([
    prisma.performance.findMany({
      where: {
        actorId: actor.id,
        movie: { is: { isFeaturette: false } },
      },
      select: {
        id: true,
        userId: true,
        actorId: true,
        movieId: true,
        comment: true,
        character: true,
        seededAggregateScore: true,
        createdAt: true,
        updatedAt: true,
        movie: { select: actorApiMovieSelect },
        actor: { select: { id: true, name: true, slug: true, imageUrl: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
    prisma.rating.findMany({
      where: { actorId: actor.id },
      select: {
        userId: true,
        movieId: true,
        roleName: true,
        weightedScore: true,
        emotionalRangeDepth: true,
        characterBelievability: true,
        technicalSkill: true,
        screenPresence: true,
        chemistryInteraction: true,
        createdAt: true,
        comment: true,
        isSpoiler: true,
        commentHidden: true,
        user: { select: { username: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  ])

  const featuredReviewByMovie = new Map<string, { comment: string; displayName: string }>()
  for (const rating of ratings) {
    const text = rating.comment?.trim()
    if (!text || rating.commentHidden || rating.isSpoiler) continue
    if (featuredReviewByMovie.has(rating.movieId)) continue
    featuredReviewByMovie.set(rating.movieId, {
      comment: text,
      displayName: rating.user?.username
        ? `@${rating.user.username}`
        : rating.user?.name?.trim() || "Viewer",
    })
  }

  const ratingsByMovie = new Map<string, typeof ratings>()
  for (const rating of ratings) {
    const key = rating.movieId
    if (!ratingsByMovie.has(key)) ratingsByMovie.set(key, [])
    ratingsByMovie.get(key)!.push(rating)
  }

  const ratingMap = new Map<
    string,
    {
      roleName: string | null
      emotionalRangeDepth: number
      characterBelievability: number
      technicalSkill: number
      screenPresence: number
      chemistryInteraction: number
      ratingCount: number
      scoreVariance: number
    }
  >()
  let weightedScoreSum = 0
  let weightedScoreCount = 0
  const criteriaSums: Record<string, { sum: number; n: number }> = {}
  for (const k of criteriaKeys) criteriaSums[k] = { sum: 0, n: 0 }

  ratingsByMovie.forEach((movieRatings, movieId) => {
    const count = movieRatings.length
    const first = movieRatings[0]!
    const avg = (field: (typeof criteriaKeys)[number]) =>
      Math.round(movieRatings.reduce((s, r) => s + (r[field] || 0), 0) / count)
    const perRatingScores = movieRatings.map((r) => {
      const vals = criteriaKeys
        .map((k) => r[k])
        .filter((s): s is number => typeof s === "number" && s > 0)
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    })
    let scoreVariance = 0
    if (perRatingScores.length > 1) {
      const mean = perRatingScores.reduce((a, b) => a + b, 0) / perRatingScores.length
      scoreVariance =
        perRatingScores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / perRatingScores.length
    }
    for (const r of movieRatings) {
      if (r.weightedScore != null && Number.isFinite(Number(r.weightedScore))) {
        weightedScoreSum += Number(r.weightedScore)
        weightedScoreCount += 1
      }
      for (const k of criteriaKeys) {
        const v = r[k]
        if (typeof v === "number" && v > 0) {
          criteriaSums[k]!.sum += v
          criteriaSums[k]!.n += 1
        }
      }
    }
    ratingMap.set(movieId, {
      roleName: first.roleName,
      emotionalRangeDepth: avg("emotionalRangeDepth"),
      characterBelievability: avg("characterBelievability"),
      technicalSkill: avg("technicalSkill"),
      screenPresence: avg("screenPresence"),
      chemistryInteraction: avg("chemistryInteraction"),
      ratingCount: count,
      scoreVariance,
    })
  })

  const totalRatingCount = ratings.length
  const aggregateWeightedScore =
    weightedScoreCount > 0 ? weightedScoreSum / weightedScoreCount : null
  const careerCriteriaAverages = criteriaKeys
    .map((key) => {
      const { sum, n } = criteriaSums[key]!
      if (n === 0) return null
      return { key, avg: sum / n }
    })
    .filter((row): row is { key: (typeof criteriaKeys)[number]; avg: number } => row !== null)

  const ratedMovieIds = new Set(ratings.map((r) => r.movieId))
  const ratedMovies =
    ratedMovieIds.size > 0
      ? await prisma.movie.findMany({
          where: {
            id: { in: Array.from(ratedMovieIds) },
            isFeaturette: false,
          },
          select: actorApiMovieSelect,
        })
      : []

  const userIdsWhoRatedByMovie = new Map<string, Set<string | null>>()
  ratingsByMovie.forEach((movieRatings, movieId) => {
    userIdsWhoRatedByMovie.set(movieId, new Set(movieRatings.map((r) => r.userId)))
  })

  const performanceMap = new Map<string, (typeof performances)[number]>()
  const mergePerf = <T extends { character: string | null; comment: string | null; order?: number | null; tier?: string | null }>(
    preferred: T,
    other: T
  ) => ({
    ...preferred,
    character: pickBetterCharacter(preferred.character, other.character),
    comment: hasUsableCharacter(preferred.character)
      ? preferred.comment
      : (other.comment ?? preferred.comment),
    order: preferred.order ?? other.order,
    tier: preferred.tier ?? other.tier,
  })

  performances.forEach((perf) => {
    const existing = performanceMap.get(perf.movieId)
    const ratedUserIds = userIdsWhoRatedByMovie.get(perf.movieId)
    const perfHasRating = !!(perf.userId && ratedUserIds?.has(perf.userId))
    const existingHasRating = !!(existing?.userId && ratedUserIds?.has(existing.userId))
    const perfIsSystem = perf.userId === SYSTEM_USER_ID
    const existingIsSystem = existing?.userId === SYSTEM_USER_ID
    if (!existing) {
      performanceMap.set(perf.movieId, perf)
    } else if (perfHasRating && !existingHasRating) {
      performanceMap.set(perf.movieId, mergePerf(perf, existing))
    } else if (!perfHasRating && existingHasRating) {
      performanceMap.set(perf.movieId, mergePerf(existing, perf))
    } else if (perfIsSystem && !existingIsSystem) {
      performanceMap.set(perf.movieId, mergePerf(perf, existing))
    } else if (!perfIsSystem && existingIsSystem) {
      performanceMap.set(perf.movieId, mergePerf(existing, perf))
    } else if (perf.updatedAt > (existing.updatedAt || new Date(0))) {
      performanceMap.set(perf.movieId, mergePerf(perf, existing))
    } else {
      performanceMap.set(perf.movieId, mergePerf(existing, perf))
    }
  })

  const uniquePerformances = Array.from(performanceMap.values())
  const enrichedPerformances: ActorPagePerformance[] = uniquePerformances.map((performance) => {
    const rating = ratingMap.get(performance.movieId)
    return {
      ...performance,
      roleName: rating?.roleName || null,
      emotionalRangeDepth: rating?.emotionalRangeDepth || 0,
      characterBelievability: rating?.characterBelievability || 0,
      technicalSkill: rating?.technicalSkill || 0,
      screenPresence: rating?.screenPresence || 0,
      chemistryInteraction: rating?.chemistryInteraction || 0,
      ratingCount: rating?.ratingCount || 0,
      scoreVariance: rating?.scoreVariance || 0,
      featuredReview: featuredReviewByMovie.get(performance.movieId) ?? null,
      user: {
        name: `User ${performance.userId?.slice(-4) || "Unknown"}`,
        email: `user@example.com`,
      },
    }
  })

  ratedMovies.forEach((movie) => {
    if (performanceMap.has(movie.id)) return
    const movieRatings = ratingsByMovie.get(movie.id) || []
    if (movieRatings.length === 0) return
    const firstRating = movieRatings[0]!
    const avgRating = {
      emotionalRangeDepth: Math.round(
        movieRatings.reduce((sum, r) => sum + (r.emotionalRangeDepth || 0), 0) / movieRatings.length
      ),
      characterBelievability: Math.round(
        movieRatings.reduce((sum, r) => sum + (r.characterBelievability || 0), 0) /
          movieRatings.length
      ),
      technicalSkill: Math.round(
        movieRatings.reduce((sum, r) => sum + (r.technicalSkill || 0), 0) / movieRatings.length
      ),
      screenPresence: Math.round(
        movieRatings.reduce((sum, r) => sum + (r.screenPresence || 0), 0) / movieRatings.length
      ),
      chemistryInteraction: Math.round(
        movieRatings.reduce((sum, r) => sum + (r.chemistryInteraction || 0), 0) /
          movieRatings.length
      ),
    }
    enrichedPerformances.push({
      id: `rating-${movie.id}`,
      userId: firstRating.userId,
      actorId: actor.id,
      movieId: movie.id,
      comment: null,
      character: firstRating.roleName || null,
      seededAggregateScore: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      movie,
      actor: { id: actor.id, name: actor.name, slug: actor.slug, imageUrl: actor.imageUrl },
      roleName: firstRating.roleName || null,
      emotionalRangeDepth: avgRating.emotionalRangeDepth,
      characterBelievability: avgRating.characterBelievability,
      technicalSkill: avgRating.technicalSkill,
      screenPresence: avgRating.screenPresence,
      chemistryInteraction: avgRating.chemistryInteraction,
      ratingCount: movieRatings.length,
      scoreVariance: ratingMap.get(movie.id)?.scoreVariance || 0,
      featuredReview: featuredReviewByMovie.get(movie.id) ?? null,
      user: {
        name: `User ${firstRating.userId?.slice(-4) || "Unknown"}`,
        email: `user@example.com`,
      },
    })
  })

  const rateablePerformances = enrichedPerformances.filter(
    (p) =>
      !isNonRateablePerformance({
        character: p.character ?? p.roleName,
        movie: p.movie,
      })
  )

  const featuretteIdsToFlag = [
    ...new Set(
      enrichedPerformances
        .filter(
          (p) => p.movie && !p.movie.isFeaturette && matchesFeaturetteTitle(p.movie.title)
        )
        .map((p) => p.movieId)
        .filter(Boolean)
    ),
  ]
  if (featuretteIdsToFlag.length > 0) {
    void prisma.movie
      .updateMany({
        where: { id: { in: featuretteIdsToFlag } },
        data: { isFeaturette: true },
      })
      .catch(() => {})
  }

  return {
    ...actor,
    performances: rateablePerformances,
    totalRatingCount,
    aggregateWeightedScore,
    careerCriteriaAverages,
  }
}

/** Average of the five craft criteria on the 0–100 scale used by the actor page client. */
export function communityAverageScore100(perf: {
  emotionalRangeDepth?: number | null
  characterBelievability?: number | null
  technicalSkill?: number | null
  screenPresence?: number | null
  chemistryInteraction?: number | null
  ratingCount?: number | null
}): number | null {
  if (!perf.ratingCount || perf.ratingCount < 1) return null
  const scores = [
    perf.emotionalRangeDepth,
    perf.characterBelievability,
    perf.technicalSkill,
    perf.screenPresence,
    perf.chemistryInteraction,
  ].filter((s): s is number => typeof s === "number" && s > 0)
  if (scores.length === 0) return null
  return scores.reduce((sum, score) => sum + score, 0) / scores.length
}

/** Community score label for crawl HTML. Never invents a number when unrated. */
export function formatCommunityScoreLabel(perf: {
  emotionalRangeDepth?: number | null
  characterBelievability?: number | null
  technicalSkill?: number | null
  screenPresence?: number | null
  chemistryInteraction?: number | null
  ratingCount?: number | null
}): string {
  const avg100 = communityAverageScore100(perf)
  if (avg100 == null) return "Be the first to rate"
  return `${(avg100 / 10).toFixed(1)}/10`
}

export const ACTOR_CRAWL_SHELL_LIMIT = 50

export type ActorCrawlShellEntry = {
  movieTitle: string
  movieYear: number
  movieHref: string
  rateHref: string
  character: string | null
  scoreLabel: string
  ratingCount: number
}

/**
 * Cap and order filmography for the SSR crawl shell.
 * Order matches the actor page default "rating" sort: community avg desc,
 * then rating count desc, then year desc.
 */
export function buildActorCrawlShellEntries(
  actor: { id: string; slug?: string | null },
  performances: ActorPagePerformance[],
  limit = ACTOR_CRAWL_SHELL_LIMIT
): ActorCrawlShellEntry[] {
  const actorSeg = actor.slug || actor.id
  const ranked = [...performances]
    .filter((p) => p.movie?.title)
    .map((p) => {
      const avg100 = communityAverageScore100(p)
      return { p, avg100: avg100 ?? -1, count: p.ratingCount || 0 }
    })
    .sort((a, b) => {
      if (b.avg100 !== a.avg100) return b.avg100 - a.avg100
      if (b.count !== a.count) return b.count - a.count
      return (b.p.movie?.year || 0) - (a.p.movie?.year || 0)
    })
    .slice(0, limit)

  return ranked.map(({ p }) => {
    const movie = p.movie!
    const movieSeg = movie.slug || movie.id
    const character =
      (p.character || p.roleName || "").trim() &&
      (p.character || p.roleName || "").trim().toLowerCase() !== "unknown"
        ? (p.character || p.roleName || "").trim()
        : null
    return {
      movieTitle: movie.title,
      movieYear: movie.year,
      movieHref: `/movies/${movieSeg}`,
      rateHref: `/rate/${movieSeg}/${actorSeg}`,
      character,
      scoreLabel: formatCommunityScoreLabel(p),
      ratingCount: p.ratingCount || 0,
    }
  })
}
