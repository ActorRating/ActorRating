import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required and must be at least 2 characters long" },
        { status: 400 }
      )
    }

    const searchTerm = query.trim()

    // Cache key with short TTL to keep results hot without being stale
    const cacheKey = makeCacheKey('search', [searchTerm.toLowerCase()])
    const cached = await cacheGet<{ movies: any[]; actors: any[] }>(cacheKey)
    if (cached) {
      const res = NextResponse.json(cached)
      res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
      return res
    }

    // Helpers
    const asLike = `%${searchTerm}%`

    // Kick off both queries in parallel with individual fallbacks
    const moviesPromise = (async (): Promise<Array<{ id: string; title: string; year: number }>> => {
      try {
        const rawMovies = await prisma.$queryRaw<
          Array<{ id: string; title: string; year: number; priority: number; relevance: number }>
        >`
          SELECT id, title, year, 1 as priority, 1.0 as relevance
          FROM "Movie"
          WHERE to_tsvector('english', title) @@ plainto_tsquery('english', ${searchTerm})
          UNION
          SELECT id, title, year, 2 as priority, similarity(title, ${searchTerm}) as relevance
          FROM "Movie"
          WHERE similarity(title, ${searchTerm}) > 0.3
            AND id NOT IN (
              SELECT id FROM "Movie" 
              WHERE to_tsvector('english', title) @@ plainto_tsquery('english', ${searchTerm})
            )
          UNION
          SELECT id, title, year, 3 as priority, 0.1 as relevance
          FROM "Movie"
          WHERE title ILIKE ${asLike}
            AND id NOT IN (
              SELECT id FROM "Movie" 
              WHERE to_tsvector('english', title) @@ plainto_tsquery('english', ${searchTerm})
                OR similarity(title, ${searchTerm}) > 0.3
            )
          ORDER BY priority, relevance DESC, title
          LIMIT 10
        `
        return rawMovies.map(({ id, title, year }) => ({ id, title, year }))
      } catch {
        const ormMovies = await prisma.movie.findMany({
          where: { title: { contains: searchTerm, mode: 'insensitive' } },
          select: { id: true, title: true, year: true },
          orderBy: { title: 'asc' },
          take: 10,
        })
        return ormMovies
      }
    })()

    const actorsPromise = (async (): Promise<Array<{ id: string; name: string }>> => {
      try {
        const rawActors = await prisma.$queryRaw<
          Array<{ id: string; name: string; priority: number; relevance: number; performance_count: number }>
        >`
          SELECT 
            a.id, 
            a.name, 
            1 as priority, 
            1.0 as relevance,
            COUNT(p.id) as performance_count
          FROM "Actor" a
          LEFT JOIN "Performance" p ON a.id = p."actorId"
          WHERE (
            to_tsvector('english', a.name) @@ plainto_tsquery('english', ${searchTerm})
            OR to_tsvector('english', unaccent(a.name)) @@ plainto_tsquery('english', ${searchTerm})
            OR a.name ILIKE ${asLike}
          )
          GROUP BY a.id, a.name
          UNION
          SELECT 
            a.id, 
            a.name, 
            2 as priority, 
            GREATEST(similarity(a.name, ${searchTerm}), similarity(unaccent(a.name), ${searchTerm})) as relevance,
            COUNT(p.id) as performance_count
          FROM "Actor" a
          LEFT JOIN "Performance" p ON a.id = p."actorId"
          WHERE GREATEST(similarity(a.name, ${searchTerm}), similarity(unaccent(a.name), ${searchTerm})) > 0.4
            AND a.id NOT IN (
              SELECT id FROM "Actor" 
              WHERE to_tsvector('english', name) @@ plainto_tsquery('english', ${searchTerm})
                OR to_tsvector('english', unaccent(name)) @@ plainto_tsquery('english', ${searchTerm})
                OR name ILIKE ${asLike}
            )
          GROUP BY a.id, a.name
          UNION
          SELECT 
            a.id, 
            a.name, 
            3 as priority, 
            0.1 as relevance,
            COUNT(p.id) as performance_count
          FROM "Actor" a
          LEFT JOIN "Performance" p ON a.id = p."actorId"
          WHERE (
            unaccent(a.name) ILIKE ${asLike}
            OR a.name ILIKE ${asLike}
          )
            AND a.id NOT IN (
              SELECT id FROM "Actor" 
              WHERE to_tsvector('english', name) @@ plainto_tsquery('english', ${searchTerm})
                OR to_tsvector('english', unaccent(name)) @@ plainto_tsquery('english', ${searchTerm})
                OR name ILIKE ${asLike}
                OR GREATEST(similarity(name, ${searchTerm}), similarity(unaccent(name), ${searchTerm})) > 0.4
            )
          GROUP BY a.id, a.name
          ORDER BY priority, relevance DESC, performance_count DESC, name
          LIMIT 10
        `
        return rawActors.map(({ id, name }) => ({ id, name }))
      } catch {
        const ormActors = await prisma.actor.findMany({
          where: { name: { contains: searchTerm, mode: 'insensitive' } },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
          take: 10,
        })
        return ormActors
      }
    })()

    const [movies, actors] = await Promise.all([
      moviesPromise,
      actorsPromise,
    ])

    const payload = { movies, actors }
    // Set small TTL in Redis to reduce database pressure
    await cacheSet(cacheKey, payload, 60)

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
    return res

  } catch (error) {
    console.error("Error performing search:", error)
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    )
  }
} 