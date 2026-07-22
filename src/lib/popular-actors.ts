import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"

export type PopularActor = {
  id: string
  name: string
  imageUrl: string | null
  slug: string | null
  performanceCount: number
  careerScore: number | null
}

/** Actors ranked by rating count — for Familiar Faces / popular rails. */
export async function getPopularActors(limit = 24): Promise<PopularActor[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 48)
  const cacheKey = makeCacheKey("actors:popular", [safeLimit.toString()])
  const cached = await cacheGet<PopularActor[]>(cacheKey)
  if (cached) return cached

  const actorsWithStats = await prisma.$queryRaw<
    Array<{
      id: string
      name: string
      imageUrl: string | null
      slug: string | null
      performanceCount: bigint
      careerScore: number | null
      ratingCount: bigint
    }>
  >`
    SELECT 
      a.id,
      a.name,
      a."imageUrl",
      a.slug,
      COUNT(DISTINCT p.id)::bigint as "performanceCount",
      AVG(
        (r."emotionalRangeDepth" + 
         r."characterBelievability" + 
         r."technicalSkill" + 
         r."screenPresence" + 
         r."chemistryInteraction") / 5.0
      ) as "careerScore",
      COUNT(DISTINCT r.id)::bigint as "ratingCount"
    FROM "Actor" a
    LEFT JOIN "Performance" p ON p."actorId" = a.id
    LEFT JOIN "Rating" r ON r."actorId" = a.id
    GROUP BY a.id, a.name, a."imageUrl", a.slug
    HAVING COUNT(DISTINCT p.id) > 0
    ORDER BY "ratingCount" DESC, "careerScore" DESC NULLS LAST
    LIMIT ${safeLimit}
  `

  const actors: PopularActor[] = actorsWithStats.map((actor) => ({
    id: actor.id,
    name: actor.name,
    imageUrl: actor.imageUrl,
    slug: actor.slug,
    performanceCount: Number(actor.performanceCount),
    careerScore: actor.careerScore
      ? parseFloat(actor.careerScore.toFixed(1))
      : null,
  }))

  await cacheSet(cacheKey, actors, 300)
  return actors
}
