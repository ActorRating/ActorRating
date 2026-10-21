/**
 * Prisma loader for /movies/[slug]/best-performances hubs.
 * No self-fetch to /api. Throws on DB failure (caller must not catch into empty 200).
 */

import type { PrismaClient } from "@prisma/client"
import { isHubEnabledSlug } from "@/lib/movie-best-performances/hub-allowlist"
import { comparePerformanceSeoRows } from "@/lib/rate-page-canonical-perf"
import { computeCommunityStatsFromRatings } from "@/lib/ratings/community-stats"
import {
  bayesianPriorC,
  rankPerformances,
  sortFullCastMinors,
  type RankablePerformance,
  type RankedPerformance,
} from "@/lib/movie-best-performances/ranking"

export type HubMovie = {
  id: string
  title: string
  year: number
  slug: string | null
  posterUrl: string | null
}

export type OmittedCharacter = {
  actorId: string
  actorName: string
  /** Conflicting non-empty Performance.character values for the same actor/movie pair. */
  reason: "conflicting"
  values: string[]
}

export type MovieBestPerformancesHub = {
  movie: HubMovie
  /** Signed-in community ratings across all cast (hub’s own count). */
  totalSignedInRatings: number
  priorC: number
  rankedLeadsAndSupporting: RankedPerformance[]
  fullCastMinors: RankablePerformance[]
  omittedCharacters: OmittedCharacter[]
}

type PerfRow = {
  id: string
  actorId: string
  movieId: string
  character: string | null
  tier: string | null
  order: number | null
  userId: string | null
  createdAt: Date
  seededAggregateScore: number | null
  actor: { id: string; name: string; slug: string | null; imageUrl: string | null }
}

function resolveCharacter(
  rows: PerfRow[],
  actorName: string,
): { character: string | null; omitted: OmittedCharacter | null } {
  const values = [
    ...new Set(
      rows
        .map((r) => r.character?.trim())
        .filter((c): c is string => Boolean(c)),
    ),
  ]
  if (values.length === 1) {
    return { character: values[0], omitted: null }
  }
  if (values.length === 0) {
    // No DB character — omit from display (not uncertain, just absent).
    return { character: null, omitted: null }
  }
  return {
    character: null,
    omitted: {
      actorId: rows[0]?.actorId ?? "",
      actorName,
      reason: "conflicting",
      values,
    },
  }
}

function pickCanonicalRow(rows: PerfRow[]): PerfRow {
  const sorted = [...rows].sort(comparePerformanceSeoRows)
  return sorted[0]
}

export async function loadMovieBestPerformancesHub(
  prisma: PrismaClient,
  slug: string,
): Promise<MovieBestPerformancesHub | null> {
  // Thin-index guard: non-allowlisted slugs never hit the database.
  if (!isHubEnabledSlug(slug)) return null

  const movie = await prisma.movie.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: {
      id: true,
      title: true,
      year: true,
      slug: true,
      posterUrl: true,
      isFeaturette: true,
    },
  })
  if (!movie || movie.isFeaturette) return null

  const performances = await prisma.performance.findMany({
    where: { movieId: movie.id },
    select: {
      id: true,
      actorId: true,
      movieId: true,
      character: true,
      tier: true,
      order: true,
      userId: true,
      createdAt: true,
      seededAggregateScore: true,
      actor: { select: { id: true, name: true, slug: true, imageUrl: true } },
    },
  })

  const byActor = new Map<string, PerfRow[]>()
  for (const p of performances) {
    const list = byActor.get(p.actorId)
    if (list) list.push(p)
    else byActor.set(p.actorId, [p])
  }

  const ratings = await prisma.rating.findMany({
    where: { movieId: movie.id, userId: { not: null } },
    select: {
      actorId: true,
      emotionalRangeDepth: true,
      characterBelievability: true,
      technicalSkill: true,
      screenPresence: true,
      chemistryInteraction: true,
    },
  })

  const ratingsByActor = new Map<string, typeof ratings>()
  for (const r of ratings) {
    const list = ratingsByActor.get(r.actorId)
    if (list) list.push(r)
    else ratingsByActor.set(r.actorId, [r])
  }

  const omittedCharacters: OmittedCharacter[] = []
  const allRoles: RankablePerformance[] = []

  for (const [, rows] of byActor) {
    const best = pickCanonicalRow(rows)
    const { character, omitted } = resolveCharacter(rows, best.actor.name)
    if (omitted) omittedCharacters.push(omitted)

    const stats = computeCommunityStatsFromRatings(ratingsByActor.get(best.actorId) ?? [])
    allRoles.push({
      performanceId: best.id,
      actorId: best.actorId,
      actorName: best.actor.name,
      actorSlug: best.actor.slug,
      actorImageUrl: best.actor.imageUrl,
      character,
      tier: best.tier,
      order: best.order,
      avg10: stats.count > 0 ? stats.avg10 : null,
      count: stats.count,
    })
  }

  const totalSignedInRatings = allRoles.reduce((s, r) => s + r.count, 0)
  const priorC = bayesianPriorC(allRoles)

  const leadsAndSupporting = allRoles.filter(
    (r) => r.tier === "LEAD" || r.tier === "SUPPORTING",
  )
  const minors = allRoles.filter((r) => r.tier === "MINOR")

  return {
    movie: {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      slug: movie.slug,
      posterUrl: movie.posterUrl,
    },
    totalSignedInRatings,
    priorC,
    rankedLeadsAndSupporting: rankPerformances(leadsAndSupporting, { c: priorC }),
    fullCastMinors: sortFullCastMinors(minors),
    omittedCharacters,
  }
}
