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
  /**
   * conflicting — multiple different characters on the same actor/movie pair.
   * duplicate_across_cast — same character name on 2+ actors (unreliable billing data).
   */
  reason: "conflicting" | "duplicate_across_cast"
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
  if (values.length === 0) {
    return { character: null, omitted: null }
  }
  if (values.length > 1) {
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
  // Prefer the canonical row’s character when it matches the sole distinct value.
  const best = [...rows].sort(comparePerformanceSeoRows)[0]
  const canonical = best?.character?.trim() || values[0]
  return { character: canonical, omitted: null }
}

function pickCanonicalRow(rows: PerfRow[]): PerfRow {
  const sorted = [...rows].sort(comparePerformanceSeoRows)
  return sorted[0]
}

/**
 * When the same character name is billed to 2+ actors on one film, TMDB/billing
 * data is unreliable — omit rather than show a wrong credit (e.g. two “Circe”).
 */
export function omitDuplicateCastCharacters(
  roles: RankablePerformance[],
): { roles: RankablePerformance[]; omitted: OmittedCharacter[] } {
  const counts = new Map<string, number>()
  for (const r of roles) {
    if (!r.character) continue
    counts.set(r.character, (counts.get(r.character) ?? 0) + 1)
  }
  const omitted: OmittedCharacter[] = []
  const next = roles.map((r) => {
    if (!r.character || (counts.get(r.character) ?? 0) < 2) return r
    omitted.push({
      actorId: r.actorId,
      actorName: r.actorName,
      reason: "duplicate_across_cast",
      values: [r.character],
    })
    return { ...r, character: null }
  })
  return { roles: next, omitted }
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
  const built: RankablePerformance[] = []

  for (const [, rows] of byActor) {
    const best = pickCanonicalRow(rows)
    const { character, omitted } = resolveCharacter(rows, best.actor.name)
    if (omitted) omittedCharacters.push(omitted)

    const stats = computeCommunityStatsFromRatings(ratingsByActor.get(best.actorId) ?? [])
    built.push({
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

  const { roles: allRoles, omitted: dupOmitted } = omitDuplicateCastCharacters(built)
  omittedCharacters.push(...dupOmitted)

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
