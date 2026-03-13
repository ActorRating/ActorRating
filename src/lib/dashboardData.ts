/**
 * Server-side dashboard data for fast first paint (no client loading spinner).
 */

import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'

const POPULAR_ACTOR_NAMES = [
  'Cillian Murphy',
  'Leonardo DiCaprio',
  'Florence Pugh',
  'Robert De Niro',
  'Zendaya',
  'Christian Bale',
]

export type DashboardRating = {
  id: string
  actorId: string
  movieId: string
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
  weightedScore: number | null
  comment: string | null
  createdAt: string
  actor: { id: string; name: string; slug: string | null; imageUrl: string | null }
  movie: { id: string; title: string; year: number; director: string | null; slug: string | null }
}

export type DashboardActor = {
  id: string
  name: string
  imageUrl: string | null
  slug: string | null
  performanceCount?: number
  careerScore?: number | null
}

export async function getDashboardData(userId: string): Promise<{
  ratings: DashboardRating[]
  popularActors: DashboardActor[]
}> {
  const [ratings, popularActors] = await Promise.all([
    prisma.rating.findMany({
      where: { userId, movie: { isFeaturette: false } },
      include: {
        actor: {
          select: { id: true, name: true, imageUrl: true, slug: true },
        },
        movie: {
          select: { id: true, title: true, year: true, director: true, slug: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
    }),
    getPopularActorsByNames(POPULAR_ACTOR_NAMES),
  ])

  const serializedRatings: DashboardRating[] = ratings.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    actor: { ...r.actor, imageUrl: r.actor.imageUrl ?? null },
    movie: r.movie,
  }))

  return { ratings: serializedRatings, popularActors }
}

async function getPopularActorsByNames(names: string[]): Promise<DashboardActor[]> {
  const cacheKey = makeCacheKey('actors:popular:names', [names.slice().sort().join(',')])
  const cached = await cacheGet<DashboardActor[]>(cacheKey)
  if (cached) return cached

  const actors = await prisma.actor.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true, imageUrl: true, slug: true },
  })

  const withStats = await Promise.all(
    actors.map(async (actor) => {
      const [performanceCount, ratingRows] = await Promise.all([
        prisma.performance.count({ where: { actorId: actor.id, movie: { isFeaturette: false } } }),
        prisma.rating.findMany({
          where: { actorId: actor.id },
          select: {
            emotionalRangeDepth: true,
            characterBelievability: true,
            technicalSkill: true,
            screenPresence: true,
            chemistryInteraction: true,
          },
        }),
      ])
      let careerScore: number | null = null
      if (ratingRows.length > 0) {
        const avg =
          ratingRows.reduce(
            (sum, r) =>
              sum +
              (r.emotionalRangeDepth +
                r.characterBelievability +
                r.technicalSkill +
                r.screenPresence +
                r.chemistryInteraction) /
                5,
            0
          ) / ratingRows.length
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
    })
  )

  const nameOrder = new Map(names.map((name, idx) => [name, idx]))
  const sorted = withStats.sort((a, b) => {
    const aIdx = nameOrder.get(a.name) ?? 999
    const bIdx = nameOrder.get(b.name) ?? 999
    return aIdx - bIdx
  })

  await cacheSet(cacheKey, sorted, 300)
  return sorted
}
