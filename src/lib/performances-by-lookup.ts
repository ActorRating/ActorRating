/**
 * Server-side only. Fetches performances by actor/movie name pairs.
 * Used by the API route and by the performances page for SSR.
 */

import { isStaticProductionBuild } from "@/lib/is-static-build"
import { prisma } from "@/lib/prisma"

export interface LookupTarget {
  actor: string
  movie: string
}

export interface EnrichedPerformance {
  id: string
  actorId: string
  movieId: string
  character: string | null
  actor: { id: string; name: string; imageUrl?: string | null; slug: string | null }
  movie: { id: string; title: string; year: number; director?: string | null; slug: string | null; posterUrl?: string | null }
  averageRating: number | null
  ratingCount: number
}

function computeAverage(ratings: Array<Record<string, unknown>> = []): number {
  if (!Array.isArray(ratings) || ratings.length === 0) return 0
  const fields = [
    "emotionalRangeDepth",
    "characterBelievability",
    "technicalSkill",
    "screenPresence",
    "chemistryInteraction",
  ]
  const perRating = ratings.map((r) => {
    const values = fields
      .map((f) => r[f])
      .filter((v): v is number => typeof v === "number")
    if (values.length === 0) return 0
    return values.reduce((s, v) => s + v, 0) / values.length
  })
  return perRating.reduce((s, v) => s + v, 0) / perRating.length
}

export async function getPerformancesByLookup(
  targets: LookupTarget[]
): Promise<EnrichedPerformance[]> {
  if (isStaticProductionBuild()) return []
  if (!Array.isArray(targets) || targets.length === 0) return []

  const actorNames = [...new Set(targets.map((t) => t.actor).filter(Boolean))]
  const movieTitles = [...new Set(targets.map((t) => t.movie).filter(Boolean))]
  if (actorNames.length === 0 || movieTitles.length === 0) return []

  const [actors, movies] = await Promise.all([
    prisma.actor.findMany({
      where: { name: { in: actorNames } },
      select: { id: true, name: true, imageUrl: true, slug: true },
    }),
    prisma.movie.findMany({
      where: { title: { in: movieTitles } },
      select: { id: true, title: true, year: true, director: true, slug: true, posterUrl: true },
    }),
  ])

  const actorMap = new Map(actors.map((a) => [a.name, a]))
  const movieMap = new Map(movies.map((m) => [m.title, m]))

  const actorMoviePairs: Array<{ actorId: string; movieId: string }> = []
  for (const target of targets) {
    const actor = actorMap.get(target.actor)
    const movie = movieMap.get(target.movie)
    if (actor && movie) actorMoviePairs.push({ actorId: actor.id, movieId: movie.id })
  }

  if (actorMoviePairs.length === 0) return []

  const performances = await prisma.performance.findMany({
    where: {
      OR: actorMoviePairs.map((pair) => ({
        actorId: pair.actorId,
        movieId: pair.movieId,
      })),
    },
    include: {
      actor: { select: { id: true, name: true, imageUrl: true, slug: true } },
      movie: { select: { id: true, title: true, year: true, director: true, slug: true, posterUrl: true } },
    },
  })

  const performanceMap = new Map(
    performances.map((p) => [`${p.actorId}:${p.movieId}`, p])
  )

  const allPerformances: typeof performances = []
  for (const pair of actorMoviePairs) {
    const p = performanceMap.get(`${pair.actorId}:${pair.movieId}`)
    if (p) allPerformances.push(p)
  }

  const valid = allPerformances.filter((p) => p.actor && p.movie)
  if (valid.length === 0) return []

  const ratingPairs = valid.map((p) => ({ actorId: p.actorId, movieId: p.movieId }))
  const ratings = await prisma.rating.findMany({
    where: { OR: ratingPairs },
    select: {
      actorId: true,
      movieId: true,
      emotionalRangeDepth: true,
      characterBelievability: true,
      technicalSkill: true,
      screenPresence: true,
      chemistryInteraction: true,
    },
  })

  const ratingsMap = new Map<string, typeof ratings>()
  for (const r of ratings) {
    const key = `${r.actorId}:${r.movieId}`
    if (!ratingsMap.has(key)) ratingsMap.set(key, [])
    ratingsMap.get(key)!.push(r)
  }

  return valid.map((p) => {
    const key = `${p.actorId}:${p.movieId}`
    const perfRatings = ratingsMap.get(key) ?? []
    const ratingCount = perfRatings.length
    const avg = ratingCount > 0 ? computeAverage(perfRatings as Array<Record<string, unknown>>) : null
    return {
      id: p.id,
      actorId: p.actorId,
      movieId: p.movieId,
      character: p.character,
      actor: p.actor,
      movie: p.movie,
      averageRating: avg,
      ratingCount,
    }
  })
}
