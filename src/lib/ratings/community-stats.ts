/**
 * Shared community score for an actor+movie pair — same rule as the /rate/
 * score bubble (GET /api/ratings/community-stats).
 *
 * Only signed-in ratings (userId not null). Average of the five craft
 * dimensions per rating, then mean across ratings, scaled to 0–10.
 */

import type { PrismaClient } from "@prisma/client"

export const COMMUNITY_STAT_FIELDS = [
  "emotionalRangeDepth",
  "characterBelievability",
  "technicalSkill",
  "screenPresence",
  "chemistryInteraction",
] as const

export type CommunityStatField = (typeof COMMUNITY_STAT_FIELDS)[number]

export type CommunityRatingDims = Record<CommunityStatField, number | null>

/** Empty pair: no `dimensions` key (preserves API response shape). */
export type CommunityStatsEmpty = { avg10: null; count: 0 }

export type CommunityStatsWithDims = {
  avg10: number | null
  count: number
  dimensions: Record<CommunityStatField, number | null>
}

export type CommunityStatsResult = CommunityStatsEmpty | CommunityStatsWithDims

export function computeCommunityStatsFromRatings(
  ratings: Array<Partial<CommunityRatingDims>>,
): CommunityStatsResult {
  if (ratings.length === 0) {
    return { avg10: null, count: 0 }
  }

  const perRating = ratings.map((r) => {
    const vals = COMMUNITY_STAT_FIELDS.map((f) => r[f]).filter(
      (v): v is number => typeof v === "number",
    )
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
  })
  const avg100 = perRating.reduce((s, v) => s + v, 0) / perRating.length
  const avg10 = avg100 > 0 ? Number((avg100 / 10).toFixed(1)) : null

  const dimensions = {} as Record<CommunityStatField, number | null>
  for (const field of COMMUNITY_STAT_FIELDS) {
    const vals = ratings
      .map((r) => r[field])
      .filter((v): v is number => typeof v === "number")
    if (vals.length === 0) {
      dimensions[field] = null
    } else {
      const dimAvg100 = vals.reduce((s, v) => s + v, 0) / vals.length
      dimensions[field] = dimAvg100 > 0 ? Number((dimAvg100 / 10).toFixed(1)) : null
    }
  }

  return { avg10, count: ratings.length, dimensions }
}

/**
 * Community average (0–10) and signed-in rating count for one actor+movie pair.
 * Identical semantics to GET /api/ratings/community-stats.
 */
export async function getCommunityStatsForPair(
  prisma: PrismaClient,
  actorId: string,
  movieId: string,
): Promise<CommunityStatsResult> {
  const ratings = await prisma.rating.findMany({
    where: { actorId, movieId, userId: { not: null } },
    select: {
      emotionalRangeDepth: true,
      characterBelievability: true,
      technicalSkill: true,
      screenPresence: true,
      chemistryInteraction: true,
    },
  })
  return computeCommunityStatsFromRatings(ratings)
}
