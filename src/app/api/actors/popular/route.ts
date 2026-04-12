export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '6', 10)
    const namesParam = searchParams.get('names')

    // If specific names are provided, fetch those actors
    if (namesParam) {
      const actorNames = namesParam.split(',').map(n => n.trim()).filter(Boolean)
      const cacheKey = makeCacheKey('actors:popular:names', [actorNames.sort().join(',')])
      const cached = await cacheGet<any[]>(cacheKey)
      if (cached) {
        const res = NextResponse.json(cached)
        res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800')
        return res
      }

      // Fetch actors by specific names using Prisma
      const actors = await prisma.actor.findMany({
        where: {
          name: { in: actorNames }
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          slug: true,
        }
      })

      // Get stats for each actor
      const actorsWithStats = await Promise.all(actors.map(async (actor) => {
        const [performanceCount, ratings] = await Promise.all([
          prisma.performance.count({
            where: { actorId: actor.id, movie: { is: { isFeaturette: false } } }
          }),
          prisma.rating.findMany({
            where: { actorId: actor.id },
            select: {
              emotionalRangeDepth: true,
              characterBelievability: true,
              technicalSkill: true,
              screenPresence: true,
              chemistryInteraction: true,
            }
          })
        ])

        let careerScore: number | null = null
        if (ratings.length > 0) {
          const avg = ratings.reduce((sum, r) => {
            return sum + (r.emotionalRangeDepth + r.characterBelievability + r.technicalSkill + r.screenPresence + r.chemistryInteraction) / 5
          }, 0) / ratings.length
          careerScore = parseFloat(avg.toFixed(1))
        }

        return {
          id: actor.id,
          name: actor.name,
          imageUrl: actor.imageUrl,
          slug: actor.slug,
          performanceCount,
          careerScore,
        }
      }))

      // Sort by original order
      const nameOrder = new Map(actorNames.map((name, idx) => [name, idx]))
      const actorsSorted = actorsWithStats.sort((a, b) => {
        const aIdx = nameOrder.get(a.name) ?? 999
        const bIdx = nameOrder.get(b.name) ?? 999
        return aIdx - bIdx
      })

      await cacheSet(cacheKey, actorsSorted, 300)
      const res = NextResponse.json(actorsSorted)
      res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800')
      return res
    }

    // Default: Get popular actors by rating count
    const cacheKey = makeCacheKey('actors:popular', [limit.toString()])
    const cached = await cacheGet<any[]>(cacheKey)
    if (cached) {
      const res = NextResponse.json(cached)
      res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800')
      return res
    }

    // Get actors with their performance counts and average career scores
    // Order by number of ratings (popularity) and then by career score
    const actorsWithStats = await prisma.$queryRaw<Array<{
      id: string
      name: string
      imageUrl: string | null
      slug: string | null
      performanceCount: bigint
      careerScore: number | null
      ratingCount: bigint
    }>>`
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
      LIMIT ${limit}
    `

    const actors = actorsWithStats.map(actor => ({
      id: actor.id,
      name: actor.name,
      imageUrl: actor.imageUrl,
      slug: actor.slug,
      performanceCount: Number(actor.performanceCount),
      careerScore: actor.careerScore ? parseFloat(actor.careerScore.toFixed(1)) : null,
    }))

    await cacheSet(cacheKey, actors, 300)
    const res = NextResponse.json(actors)
    res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800')
    return res
  } catch (error) {
    console.error("Error fetching popular actors:", error)
    return NextResponse.json(
      { error: "Failed to fetch popular actors" },
      { status: 500 }
    )
  }
}

