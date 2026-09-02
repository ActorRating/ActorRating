import "server-only"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/admin/cache"

export type CommentedRatingRow = {
  id: string
  comment: string
  isSpoiler: boolean
  commentHidden: boolean
  weightedScore: number
  createdAt: Date
  userId: string | null
  username: string | null
  actorId: string
  actorName: string
  actorSlug: string | null
  movieId: string
  movieTitle: string
  movieSlug: string | null
  movieYear: number
}

const CACHE_TTL_MS = 30_000
const DEFAULT_LIMIT = 100

/** Ratings with non-empty micro-review text, newest first. */
export async function getCommentedRatings(options?: {
  limit?: number
  includeHidden?: boolean
}): Promise<{ rows: CommentedRatingRow[]; totalCount: number }> {
  const limit = options?.limit ?? DEFAULT_LIMIT
  const includeHidden = options?.includeHidden ?? true
  const cacheKey = `admin:commented-ratings:${limit}:${includeHidden ? "all" : "visible"}`

  const cached = getCache<{ rows: CommentedRatingRow[]; totalCount: number }>(cacheKey)
  if (cached) return cached

  const where: Prisma.RatingWhereInput = {
    AND: [
      { comment: { not: null } },
      { NOT: { comment: "" } },
      ...(includeHidden ? [] : [{ commentHidden: false }]),
    ],
  }

  try {
    const [totalCount, raw] = await Promise.all([
      prisma.rating.count({ where }),
      prisma.rating.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          comment: true,
          isSpoiler: true,
          commentHidden: true,
          weightedScore: true,
          createdAt: true,
          userId: true,
          actorId: true,
          movieId: true,
          user: { select: { username: true } },
          actor: { select: { name: true, slug: true } },
          movie: { select: { title: true, slug: true, year: true } },
        },
      }),
    ])

    const rows: CommentedRatingRow[] = raw
      .filter((r) => (r.comment ?? "").trim().length > 0)
      .map((r) => ({
        id: r.id,
        comment: (r.comment ?? "").trim(),
        isSpoiler: r.isSpoiler,
        commentHidden: r.commentHidden,
        weightedScore: r.weightedScore,
        createdAt: r.createdAt,
        userId: r.userId,
        username: r.user?.username ?? null,
        actorId: r.actorId,
        actorName: r.actor.name,
        actorSlug: r.actor.slug,
        movieId: r.movieId,
        movieTitle: r.movie.title,
        movieSlug: r.movie.slug,
        movieYear: r.movie.year,
      }))

    const result = { rows, totalCount }
    setCache(cacheKey, result, CACHE_TTL_MS)
    return result
  } catch (error) {
    console.error("getCommentedRatings failed:", error)
    return { rows: [], totalCount: 0 }
  }
}
