/**
 * Success-screen "Rate another" picker.
 * Priority: same-movie LEADs → same-movie SUPPORTING → other films by the same actor.
 */

import type { PrismaClient, PerformanceTier } from "@prisma/client"
import { SYSTEM_USER_ID } from "@/lib/movie-ingestion"
import { isMovieComingSoon } from "@/lib/movie-release"
import { isNonRateablePerformance } from "@/lib/non-rateable"

export const RATE_ANOTHER_LIMIT = 6

export type RateAnotherPerf = {
  movieSlug: string
  actorSlug: string
  movieTitle: string
  movieYear: number
  moviePosterUrl?: string | null
  actorImageUrl?: string | null
  actorName: string
  actorId: string
  movieId: string
}

export function rateAnotherPairKey(actorId: string, movieId: string): string {
  return `${actorId}:${movieId}`
}

type PerfRow = {
  actorId: string
  movieId: string
  character: string | null
  order: number | null
  tier: PerformanceTier
  userId: string | null
  updatedAt: Date
  actor: {
    id: string
    name: string
    slug: string | null
    imageUrl: string | null
  }
  movie: {
    id: string
    title: string
    slug: string | null
    year: number
    posterUrl: string | null
    isFeaturette: boolean
    releaseDate: Date | null
  }
}

function prefersRow(candidate: PerfRow, existing: PerfRow): boolean {
  const candSys = candidate.userId === SYSTEM_USER_ID
  const existingSys = existing.userId === SYSTEM_USER_ID
  if (candSys !== existingSys) return candSys
  const candOrder = candidate.order ?? Number.POSITIVE_INFINITY
  const existingOrder = existing.order ?? Number.POSITIVE_INFINITY
  if (candOrder !== existingOrder) return candOrder < existingOrder
  return candidate.updatedAt.getTime() > existing.updatedAt.getTime()
}

function dedupeByActorMovie(rows: PerfRow[]): PerfRow[] {
  const map = new Map<string, PerfRow>()
  for (const row of rows) {
    const key = rateAnotherPairKey(row.actorId, row.movieId)
    const existing = map.get(key)
    if (!existing || prefersRow(row, existing)) {
      map.set(key, row)
    }
  }
  return Array.from(map.values())
}

function toItem(row: PerfRow): RateAnotherPerf {
  return {
    movieSlug: row.movie.slug ?? row.movie.id,
    actorSlug: row.actor.slug ?? row.actor.id,
    movieTitle: row.movie.title,
    movieYear: row.movie.year,
    moviePosterUrl: row.movie.posterUrl,
    actorImageUrl: row.actor.imageUrl,
    actorName: row.actor.name,
    actorId: row.actor.id,
    movieId: row.movie.id,
  }
}

function isEligibleRateTarget(row: PerfRow): boolean {
  if (isNonRateablePerformance({ character: row.character, movie: row.movie })) {
    return false
  }
  if (isMovieComingSoon(row.movie)) return false
  return true
}

const movieSelect = {
  id: true,
  title: true,
  slug: true,
  year: true,
  posterUrl: true,
  isFeaturette: true,
  releaseDate: true,
} as const

const actorSelect = {
  id: true,
  name: true,
  slug: true,
  imageUrl: true,
} as const

/**
 * Build up to `limit` rate-another suggestions.
 * `excludePairs` should already include the just-rated pair and any known ratings.
 */
export async function getRateAnotherPerformances(
  prisma: PrismaClient,
  opts: {
    actorId: string
    movieId: string
    excludePairs: Set<string>
    limit?: number
  }
): Promise<RateAnotherPerf[]> {
  const { actorId, movieId, excludePairs } = opts
  const limit = opts.limit ?? RATE_ANOTHER_LIMIT
  const results: RateAnotherPerf[] = []
  const seen = new Set<string>(excludePairs)

  const pushRows = (rows: PerfRow[], sort: (a: PerfRow, b: PerfRow) => number) => {
    const eligible = dedupeByActorMovie(rows)
      .filter(isEligibleRateTarget)
      .sort(sort)
    for (const row of eligible) {
      if (results.length >= limit) break
      const key = rateAnotherPairKey(row.actorId, row.movieId)
      if (seen.has(key)) continue
      seen.add(key)
      results.push(toItem(row))
    }
  }

  const sameMovie = (await prisma.performance.findMany({
    where: {
      movieId,
      actorId: { not: actorId },
      tier: { in: ["LEAD", "SUPPORTING"] },
    },
    select: {
      actorId: true,
      movieId: true,
      character: true,
      order: true,
      tier: true,
      userId: true,
      updatedAt: true,
      actor: { select: actorSelect },
      movie: { select: movieSelect },
    },
  })) as PerfRow[]

  const byBilling = (a: PerfRow, b: PerfRow) =>
    (a.order ?? 999) - (b.order ?? 999) || a.actor.name.localeCompare(b.actor.name)

  pushRows(
    sameMovie.filter((p) => p.tier === "LEAD"),
    byBilling
  )
  if (results.length < limit) {
    pushRows(
      sameMovie.filter((p) => p.tier === "SUPPORTING"),
      byBilling
    )
  }

  if (results.length < limit) {
    const sameActor = (await prisma.performance.findMany({
      where: {
        actorId,
        movieId: { not: movieId },
        movie: { is: { isFeaturette: false } },
      },
      select: {
        actorId: true,
        movieId: true,
        character: true,
        order: true,
        tier: true,
        userId: true,
        updatedAt: true,
        actor: { select: actorSelect },
        movie: { select: movieSelect },
      },
      orderBy: { movie: { year: "desc" } },
    })) as PerfRow[]

    pushRows(
      sameActor,
      (a, b) =>
        b.movie.year - a.movie.year ||
        (a.order ?? 999) - (b.order ?? 999)
    )
  }

  return results.slice(0, limit)
}

/** Same-actor filmography progress for the auth success progress bar. */
export async function getSameActorRateProgress(
  prisma: PrismaClient,
  opts: {
    actorId: string
    ratedMovieIds: Set<string>
  }
): Promise<{ totalPerformances: number; userRatedCount: number }> {
  const performances = await prisma.performance.findMany({
    where: {
      actorId: opts.actorId,
      movie: { is: { isFeaturette: false } },
    },
    select: {
      movieId: true,
      character: true,
      movie: {
        select: {
          title: true,
          isFeaturette: true,
          releaseDate: true,
          year: true,
        },
      },
    },
  })

  const seenMovies = new Set<string>()
  let total = 0
  for (const p of performances) {
    if (seenMovies.has(p.movieId)) continue
    if (
      isNonRateablePerformance({ character: p.character, movie: p.movie }) ||
      isMovieComingSoon(p.movie)
    ) {
      continue
    }
    seenMovies.add(p.movieId)
    total += 1
  }

  let userRatedCount = 0
  for (const movieId of opts.ratedMovieIds) {
    if (seenMovies.has(movieId)) userRatedCount += 1
  }

  return { totalPerformances: total, userRatedCount }
}
