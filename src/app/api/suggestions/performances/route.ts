import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

type AggregatedPair = {
  actorId: string
  movieId: string
  ratingsCount: number
}

type SuggestedItem = {
  id: string
  actorId: string
  movieId: string
  ratingsCount: number
  characterName?: string | null
  // kept for backward compatibility with older clients
  comment?: string | null
  actor: { id: string; name: string; imageUrl: string | null }
  movie: { id: string; title: string; year: number }
  averageScore?: number
}

// Config & constants
const TAKE_POOL = 20
const FINAL_COUNT = 6
const DEBUG = process.env.DEBUG_SUGGESTIONS === "true"

// Simple in-memory cache for Popular and Trending pools
const POPULAR_TTL_MS = 5 * 60 * 1000 // 5 minutes
const TRENDING_TTL_MS = 2 * 60 * 1000 // 2 minutes

let popularCache: { data: AggregatedPair[]; expiresAt: number } | null = null
let trendingCache: { data: AggregatedPair[]; expiresAt: number } | null = null

function now(): number {
  return Date.now()
}

function isCacheValid(cache: { data: AggregatedPair[]; expiresAt: number } | null): boolean {
  return Boolean(cache && cache.expiresAt > now())
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

async function fetchRandomPairsExcludingMovies(excludedMovieIds: string[], take: number): Promise<AggregatedPair[]> {
  const whereSql = excludedMovieIds.length
    ? Prisma.sql`WHERE p."movieId" NOT IN (${Prisma.join(excludedMovieIds)})`
    : Prisma.sql``

  const rows = await prisma.$queryRaw<{ actorId: string; movieId: string }[]>(Prisma.sql`
    SELECT p."actorId", p."movieId"
    FROM "Performance" p
    ${whereSql}
    GROUP BY p."actorId", p."movieId"
    ORDER BY RANDOM()
    LIMIT ${take}
  `)

  return rows.map((r) => ({ actorId: r.actorId, movieId: r.movieId, ratingsCount: 0 }))
}

async function getPopularBase(limit: number): Promise<AggregatedPair[]> {
  if (isCacheValid(popularCache)) return popularCache!.data.slice(0, limit)

  // Group ratings by actorId+movieId to determine popularity all-time
  const rows = await prisma.$queryRaw<{ actorId: string; movieId: string; cnt: number }[]>(Prisma.sql`
    SELECT r."actorId", r."movieId", COUNT(*)::int AS cnt
    FROM "Rating" r
    GROUP BY r."actorId", r."movieId"
    ORDER BY COUNT(*) DESC
    LIMIT ${Math.max(limit, TAKE_POOL)}
  `)

  const data: AggregatedPair[] = rows.map((r) => ({
    actorId: r.actorId,
    movieId: r.movieId,
    ratingsCount: Number((r as any).cnt ?? 0),
  }))

  popularCache = { data, expiresAt: now() + POPULAR_TTL_MS }
  return data.slice(0, limit)
}

async function getTrendingBase(limit: number): Promise<AggregatedPair[]> {
  if (isCacheValid(trendingCache)) return trendingCache!.data.slice(0, limit)

  // const sevenDaysAgo = new Date(now() - 7 * 24 * 60 * 60 * 1000) // PROD: 7-day window
  // Group ratings by actorId+movieId to determine trending (recent activity window optional)
  const rows = await prisma.$queryRaw<{ actorId: string; movieId: string; cnt: number }[]>(Prisma.sql`
    SELECT r."actorId", r."movieId", COUNT(*)::int AS cnt
    FROM "Rating" r
    -- WHERE r."createdAt" >= ${new Date(now() - 7 * 24 * 60 * 60 * 1000)}  -- enable in prod for 7-day trending
    GROUP BY r."actorId", r."movieId"
    ORDER BY COUNT(*) DESC
    LIMIT ${Math.max(limit, TAKE_POOL)}
  `)

  const data: AggregatedPair[] = rows.map((r) => ({
    actorId: r.actorId,
    movieId: r.movieId,
    ratingsCount: Number((r as any).cnt ?? 0),
  }))

  trendingCache = { data, expiresAt: now() + TRENDING_TTL_MS }
  return data.slice(0, limit)
}

async function getRelatedPairs(currentUserId: string, limit: number): Promise<AggregatedPair[]> {
  // Fetch unique actor and movie ids the user has rated before
  const userRatings = await prisma.rating.findMany({
    where: { userId: currentUserId },
    select: { actorId: true, movieId: true },
    take: 500,
  })

  const userActorIds = Array.from(new Set(userRatings.map((r) => r.actorId)))
  const userMovieIds = Array.from(new Set(userRatings.map((r) => r.movieId)))

  if (userActorIds.length === 0 && userMovieIds.length === 0) return []

  // Group by pairs that share the same actor or movie the user has engaged with
  let whereClause: Prisma.Sql
  if (userMovieIds.length > 0 && userActorIds.length > 0) {
    whereClause = Prisma.sql`WHERE r."movieId" IN (${Prisma.join(userMovieIds)}) OR r."actorId" IN (${Prisma.join(userActorIds)})`
  } else if (userMovieIds.length > 0) {
    whereClause = Prisma.sql`WHERE r."movieId" IN (${Prisma.join(userMovieIds)})`
  } else {
    whereClause = Prisma.sql`WHERE r."actorId" IN (${Prisma.join(userActorIds)})`
  }

  const rows = await prisma.$queryRaw<{ actorId: string; movieId: string; cnt: number }[]>(Prisma.sql`
    SELECT r."actorId", r."movieId", COUNT(*)::int AS cnt
    FROM "Rating" r
    ${whereClause}
    GROUP BY r."actorId", r."movieId"
    ORDER BY COUNT(*) DESC
    LIMIT ${Math.max(limit, TAKE_POOL)}
  `)

  return rows.map((r) => ({
    actorId: r.actorId,
    movieId: r.movieId,
    ratingsCount: Number((r as any).cnt ?? 0),
  }))
}

async function enrichPairs(pairs: AggregatedPair[]): Promise<SuggestedItem[]> {
  const actorIds = Array.from(new Set(pairs.map((p) => p.actorId)))
  const movieIds = Array.from(new Set(pairs.map((p) => p.movieId)))

  const [actors, movies] = await Promise.all([
    prisma.actor.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, imageUrl: true } }),
    prisma.movie.findMany({ where: { id: { in: movieIds } }, select: { id: true, title: true, year: true } }),
  ])

  const actorById = new Map(actors.map((a) => [a.id, a]))
  const movieById = new Map(movies.map((m) => [m.id, m]))

  // Fetch a recent non-empty character name (comment) and average score for each pair
  const items: SuggestedItem[] = []
  for (const p of pairs) {
    const actor = actorById.get(p.actorId)
    const movie = movieById.get(p.movieId)
    if (!actor || !movie) continue

    // Get the latest non-empty comment as character name, if any
    const latestWithComment = await prisma.rating.findFirst({
      where: { actorId: p.actorId, movieId: p.movieId, NOT: { comment: null } },
      select: { comment: true },
      orderBy: { createdAt: "desc" },
    })

    // Compute community average weightedScore for this performance pair
    const avg = await prisma.rating.aggregate({
      where: { actorId: p.actorId, movieId: p.movieId },
      _avg: { weightedScore: true },
    })

    items.push({
      id: `${p.actorId}_${p.movieId}`,
      actorId: p.actorId,
      movieId: p.movieId,
      ratingsCount: p.ratingsCount,
      characterName: latestWithComment?.comment ?? null,
      comment: latestWithComment?.comment ?? null,
      actor: { id: actor.id, name: actor.name, imageUrl: actor.imageUrl ?? null },
      movie: { id: movie.id, title: movie.title, year: movie.year },
      averageScore: typeof avg._avg?.weightedScore === "number"
        ? Math.round(avg._avg.weightedScore * 10) / 10
        : undefined,
    })
  }
  return items
}

function pairKey(p: { actorId: string; movieId: string }): string {
  return `${p.actorId}::${p.movieId}`
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const currentUserId = session?.user?.id || null

    // Debug: ignore all filters and return random unique-by-movie performances
    if (DEBUG) {
      const randomPool = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM "Performance"
        ORDER BY RANDOM()
        LIMIT 50
      `)

      const seenMovies = new Set<string>()
      const uniquePairs: AggregatedPair[] = []
      for (const row of randomPool) {
        if (!seenMovies.has(row.movieId)) {
          seenMovies.add(row.movieId)
          uniquePairs.push({ actorId: row.actorId, movieId: row.movieId, ratingsCount: 0 })
        }
        if (uniquePairs.length >= 50) break
      }

      const selection = uniquePairs.slice(0, FINAL_COUNT)
      const enriched = await enrichPairs(selection)
      shuffleInPlace(enriched)

      console.log("Suggestions (DEBUG) counts:", {
        randomPool: randomPool.length,
        uniqueByMovie: uniquePairs.length,
        final: enriched.length,
      })

      return NextResponse.json({ items: enriched })
    }

    const userRatedSet: Set<string> = new Set()
    // Exclude performances already rated by the current user
    if (currentUserId) {
      const userRated = await prisma.rating.findMany({
        where: { userId: currentUserId },
        select: { actorId: true, movieId: true },
        take: 2000,
      })
      for (const r of userRated) userRatedSet.add(pairKey(r))
    }

    // Base pools (uncached related, cached popular/trending)
    const [popularBase, trendingBase] = await Promise.all([
      getPopularBase(TAKE_POOL),
      getTrendingBase(TAKE_POOL),
    ])

    const popular = popularBase.filter((p) => !userRatedSet.has(pairKey(p)))
    const trending = trendingBase.filter((p) => !userRatedSet.has(pairKey(p)))

    let related: AggregatedPair[] = []
    if (currentUserId) {
      related = (await getRelatedPairs(currentUserId, TAKE_POOL)).filter((p) => !userRatedSet.has(pairKey(p)))
    }

    console.log("Suggestions pools counts:", {
      popular: popular.length,
      trending: trending.length,
      related: related.length,
    })
    console.log("popular sample movieIds", popular.slice(0, 8).map((p) => p.movieId))
    console.log("trending sample movieIds", trending.slice(0, 8).map((p) => p.movieId))
    console.log("related sample movieIds", related.slice(0, 8).map((p) => p.movieId))

    // Shuffle each pool for variety
    shuffleInPlace(popular)
    shuffleInPlace(trending)
    shuffleInPlace(related)
    
    // Combine all pools in priority order, then apply max 1 per movieId AFTER combining.
    // Note: Earlier implementations did per-pool dedupe first, which allowed a dominant movie
    // (e.g., Inception) to occupy many final slots. To prevent that, dedupe happens only here.
    const combined: AggregatedPair[] = [...popular, ...trending, ...related]
    // Extra shuffle to avoid any residual pool-order bias
    shuffleInPlace(combined)
    const uniqueByMovie: AggregatedPair[] = []
    const seenMovieIds = new Set<string>()
    for (const item of combined) {
      if (!seenMovieIds.has(item.movieId)) {
        uniqueByMovie.push(item)
        seenMovieIds.add(item.movieId)
      }
    }

    // If fewer than FINAL_COUNT, fetch random performances excluding existing movies
    let selection: AggregatedPair[] = uniqueByMovie.slice(0, FINAL_COUNT)
    if (selection.length < FINAL_COUNT) {
      const excludeMovieIds = new Set(selection.map((s) => s.movieId))
      let attempts = 0
      while (selection.length < FINAL_COUNT && attempts < 3) {
        attempts += 1
        const batch = await fetchRandomPairsExcludingMovies(Array.from(excludeMovieIds), 30)
        for (const cand of batch) {
          if (!excludeMovieIds.has(cand.movieId)) {
            selection.push(cand)
            excludeMovieIds.add(cand.movieId)
            if (selection.length >= FINAL_COUNT) break
          }
        }
        if (batch.length === 0) break
      }
    }

    // Enrich selected pairs with actor/movie and a recent character name
    let enriched = await enrichPairs(selection)

    // Safety: ensure max 1 per movie in final payload as well
    const finalUnique: SuggestedItem[] = []
    const finalSeenMovies = new Set<string>()
    for (const item of enriched) {
      if (!finalSeenMovies.has(item.movie.id)) {
        finalUnique.push(item)
        finalSeenMovies.add(item.movie.id)
      }
    }

    // If still under target after enrichment filtering, top up with random movies not in set
    if (finalUnique.length < FINAL_COUNT) {
      const excludeMovies = Array.from(finalSeenMovies)
      let attempts = 0
      while (finalUnique.length < FINAL_COUNT && attempts < 3) {
        attempts += 1
        const extraPairs = await fetchRandomPairsExcludingMovies(excludeMovies, 30)
        if (extraPairs.length === 0) break
        const extraEnriched = await enrichPairs(extraPairs)
        for (const item of extraEnriched) {
          if (!finalSeenMovies.has(item.movie.id)) {
            finalUnique.push(item)
            finalSeenMovies.add(item.movie.id)
            if (finalUnique.length >= FINAL_COUNT) break
          }
        }
      }
    }

    // Randomize final order (avoid bias by pool order)
    shuffleInPlace(finalUnique)
    const finalItems = finalUnique.slice(0, FINAL_COUNT)

    console.log("Suggestions final count:", finalItems.length)
    console.log("Suggestions movieIds:", finalItems.map((i) => i.movie.id))
    console.log("Suggestions sample:", finalItems)

    const res = NextResponse.json({ items: finalItems })
    // Shorten server cache to 10s to keep suggestions fresher after edits
    res.headers.set('Cache-Control', 'public, max-age=10, s-maxage=60, stale-while-revalidate=120')
    return res
  } catch (error) {
    console.error("Error building suggestions:", error)
    try {
      // Last-resort fallback to avoid 500s during testing, ensure unique movies
      const fallback = await prisma.performance.findMany({
        distinct: ["movieId"],
        take: 20,
        include: {
          actor: { select: { id: true, name: true, imageUrl: true } },
          movie: { select: { id: true, title: true, year: true } },
        },
        orderBy: { createdAt: "desc" },
      })
      const items = fallback.slice(0, FINAL_COUNT).map((p) => ({
        id: `${p.actorId}_${p.movieId}`,
        actorId: p.actorId,
        movieId: p.movieId,
        ratingsCount: 0,
        comment: p.comment ?? null,
        actor: { id: p.actor.id, name: p.actor.name, imageUrl: p.actor.imageUrl ?? null },
        movie: { id: p.movie.id, title: p.movie.title, year: p.movie.year },
      }))
      console.log("Suggestions fallback used, count:", items.length)
      console.log("Suggestions fallback movieIds:", items.map((i) => i.movie.id))
      const res = NextResponse.json({ items })
      res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
      return res
    } catch (fallbackErr) {
      console.error("Suggestions fallback also failed:", fallbackErr)
      return NextResponse.json({ error: "Failed to build suggestions" }, { status: 500 })
    }
  }
}


