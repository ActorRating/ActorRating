import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'

export type SeoMovie = {
  id: string
  slug: string | null
  title: string
  year: number | null
}

export type SeoActor = {
  id: string
  slug: string | null
  name: string
}

export type SeoRecentItem = {
  id: string
  actor: SeoActor
  movie: SeoMovie
}

const TTL_SECONDS = 1800

export async function getTopRatedMovies(limit = 12): Promise<SeoMovie[]> {
  const cacheKey = makeCacheKey('home:top-movies', [limit])
  const cached = await cacheGet<SeoMovie[]>(cacheKey)
  if (cached) return cached

  const rows = await prisma.$queryRaw<Array<{ movieId: string }>>`
    SELECT r."movieId"
    FROM "Rating" r
    INNER JOIN "Movie" m ON m.id = r."movieId"
    WHERE m."isFeaturette" = false
    GROUP BY r."movieId"
    HAVING COUNT(*) >= 5
    ORDER BY AVG(
      (COALESCE(r."emotionalRangeDepth", 0) +
       COALESCE(r."characterBelievability", 0) +
       COALESCE(r."technicalSkill", 0) +
       COALESCE(r."screenPresence", 0) +
       COALESCE(r."chemistryInteraction", 0)) / 5.0
    ) DESC
    LIMIT ${limit}
  `

  if (!rows.length) {
    await cacheSet(cacheKey, [], TTL_SECONDS)
    return []
  }

  const movies = await prisma.movie.findMany({
    where: { id: { in: rows.map((r) => r.movieId) }, isFeaturette: false },
    select: { id: true, slug: true, title: true, year: true },
  })
  const movieMap = new Map(movies.map((m) => [m.id, m]))

  const ordered = rows
    .map((r) => movieMap.get(r.movieId))
    .filter((m): m is NonNullable<typeof m> => !!m)

  await cacheSet(cacheKey, ordered, TTL_SECONDS)
  return ordered
}

export async function getTopRatedActors(limit = 12): Promise<SeoActor[]> {
  const cacheKey = makeCacheKey('home:top-actors', [limit])
  const cached = await cacheGet<SeoActor[]>(cacheKey)
  if (cached) return cached

  const rows = await prisma.$queryRaw<Array<{ actorId: string }>>`
    SELECT r."actorId"
    FROM "Rating" r
    INNER JOIN "Actor" a ON a.id = r."actorId"
    GROUP BY r."actorId"
    HAVING COUNT(*) >= 5
    ORDER BY AVG(
      (COALESCE(r."emotionalRangeDepth", 0) +
       COALESCE(r."characterBelievability", 0) +
       COALESCE(r."technicalSkill", 0) +
       COALESCE(r."screenPresence", 0) +
       COALESCE(r."chemistryInteraction", 0)) / 5.0
    ) DESC
    LIMIT ${limit}
  `

  if (!rows.length) {
    await cacheSet(cacheKey, [], TTL_SECONDS)
    return []
  }

  const actors = await prisma.actor.findMany({
    where: { id: { in: rows.map((r) => r.actorId) } },
    select: { id: true, slug: true, name: true },
  })
  const actorMap = new Map(actors.map((a) => [a.id, a]))

  const ordered: SeoActor[] = rows
    .map((r) => actorMap.get(r.actorId))
    .filter((a): a is SeoActor => !!a)

  await cacheSet(cacheKey, ordered, TTL_SECONDS)
  return ordered
}

export async function getRecentlyRated(limit = 12): Promise<SeoRecentItem[]> {
  const cacheKey = makeCacheKey('home:recent-rated', [limit])
  const cached = await cacheGet<SeoRecentItem[]>(cacheKey)
  if (cached) return cached

  const ratings = await prisma.rating.findMany({
    where: { movie: { is: { isFeaturette: false } } },
    select: {
      id: true,
      actor: { select: { id: true, slug: true, name: true } },
      movie: { select: { id: true, slug: true, title: true, year: true, isFeaturette: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit * 2,
  })

  const items: SeoRecentItem[] = []
  const seenPairs = new Set<string>()

  for (const r of ratings) {
    if (!r.actor || !r.movie || r.movie.isFeaturette) continue
    const key = `${r.actor.id}:${r.movie.id}`
    if (seenPairs.has(key)) continue
    seenPairs.add(key)
    items.push({
      id: r.id,
      actor: { id: r.actor.id, slug: r.actor.slug, name: r.actor.name },
      movie: { id: r.movie.id, slug: r.movie.slug, title: r.movie.title, year: r.movie.year },
    })
    if (items.length >= limit) break
  }

  await cacheSet(cacheKey, items, TTL_SECONDS)
  return items
}

