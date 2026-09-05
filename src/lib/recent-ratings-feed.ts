import { prisma } from "@/lib/prisma"
import { isAdminHiddenUserEmail } from "@/lib/admin/hidden-users"
import { getRateUrl } from "@/lib/slugHelper"

export type RecentRatingFeedItem = {
  id: string
  weightedScore: number
  createdAt: string
  actorName: string
  movieTitle: string
  movieYear: number
  posterUrl: string | null
  actorImageUrl: string | null
  rateHref: string
}

const FEED_LIMIT = 24
const FETCH_TAKE = 60
const CACHE_TTL_MS = 12_000

let cached: { at: number; items: RecentRatingFeedItem[] } | null = null

/**
 * Latest community ratings for the public “Just rated” strip.
 * Excludes featurettes and ratings from admin-hidden / seed accounts.
 */
export async function getRecentRatingsFeed(
  limit = FEED_LIMIT,
): Promise<RecentRatingFeedItem[]> {
  const now = Date.now()
  if (cached && now - cached.at < CACHE_TTL_MS && cached.items.length > 0) {
    return cached.items.slice(0, limit)
  }

  const rows = await prisma.rating.findMany({
    where: { movie: { is: { isFeaturette: false } } },
    select: {
      id: true,
      weightedScore: true,
      createdAt: true,
      actor: {
        select: { id: true, name: true, slug: true, imageUrl: true },
      },
      movie: {
        select: {
          id: true,
          title: true,
          year: true,
          slug: true,
          posterUrl: true,
          isFeaturette: true,
        },
      },
      user: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: FETCH_TAKE,
  })

  const items: RecentRatingFeedItem[] = []
  const seenPairs = new Set<string>()

  for (const row of rows) {
    if (!row.actor || !row.movie || row.movie.isFeaturette) continue
    if (isAdminHiddenUserEmail(row.user?.email)) continue

    const pairKey = `${row.actor.id}:${row.movie.id}`
    if (seenPairs.has(pairKey)) continue
    seenPairs.add(pairKey)

    items.push({
      id: row.id,
      weightedScore: row.weightedScore,
      createdAt: row.createdAt.toISOString(),
      actorName: row.actor.name,
      movieTitle: row.movie.title,
      movieYear: row.movie.year,
      posterUrl: row.movie.posterUrl ?? null,
      actorImageUrl: row.actor.imageUrl ?? null,
      rateHref: getRateUrl(
        {
          id: row.actor.id,
          name: row.actor.name,
          slug: row.actor.slug,
        },
        {
          id: row.movie.id,
          title: row.movie.title,
          year: row.movie.year,
          slug: row.movie.slug,
        },
      ),
    })

    if (items.length >= limit) break
  }

  cached = { at: now, items }
  return items
}
