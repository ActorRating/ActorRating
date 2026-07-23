/**
 * Server-side only. Fetches performances by actor/movie name pairs.
 * Used by the API route and by the performances page for SSR.
 */

import { isStaticProductionBuild } from "@/lib/is-static-build"
import { prisma } from "@/lib/prisma"

export interface LookupTarget {
  actor: string
  movie: string
  /** Disambiguates duplicate titles (e.g. multiple "Elvis" rows) */
  year?: number
}

export interface EnrichedPerformance {
  id: string
  actorId: string
  movieId: string
  character: string | null
  actor: { id: string; name: string; imageUrl?: string | null; slug: string | null }
  movie: { id: string; title: string; year: number; director?: string | null; slug: string | null; posterUrl?: string | null; releaseDate?: Date | string | null }
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
      select: { id: true, title: true, year: true, director: true, slug: true, posterUrl: true, releaseDate: true },
    }),
  ])

  if (actors.length === 0 || movies.length === 0) return []

  const performances = await prisma.performance.findMany({
    where: {
      actorId: { in: actors.map((a) => a.id) },
      movieId: { in: movies.map((m) => m.id) },
    },
    include: {
      actor: { select: { id: true, name: true, imageUrl: true, slug: true } },
      movie: { select: { id: true, title: true, year: true, director: true, slug: true, posterUrl: true, releaseDate: true } },
    },
  })

  // Match each target to a real performance (handles duplicate movie titles via year / actor link)
  const matched: typeof performances = []
  const seen = new Set<string>()
  for (const target of targets) {
    const candidates = performances.filter(
      (p) =>
        p.actor?.name === target.actor &&
        p.movie?.title === target.movie &&
        (target.year == null || p.movie.year === target.year),
    )
    const p =
      candidates.find((c) => target.year != null && c.movie.year === target.year) ??
      candidates[0]
    if (!p) continue
    const key = `${p.actorId}:${p.movieId}`
    if (seen.has(key)) continue
    seen.add(key)
    matched.push(p)
  }

  if (matched.length === 0) return []

  const ratingPairs = matched.map((p) => ({ actorId: p.actorId, movieId: p.movieId }))
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

  return matched.map((p) => {
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
