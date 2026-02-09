import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"

const PRELOAD_CACHE_TTL_SEC = 600 // 10 minutes

export async function GET() {
  try {
    const cacheKey = makeCacheKey('search-preload', [])
    const cached = await cacheGet<{ actors: { id: string; name: string; slug: string | null }[]; movies: { id: string; title: string; slug: string | null; year: number }[] }>(cacheKey)
    if (cached) {
      const res = NextResponse.json(cached)
      res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=900')
      return res
    }

    // 200 each for inline autocomplete: prefix-only, popularity-sorted, no network after load
    const [actors, movies] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string; name: string; slug: string | null }>>`
        SELECT a.id, a.name, a.slug
        FROM "Actor" a
        ORDER BY (SELECT COUNT(*) FROM "Performance" p WHERE p."actorId" = a.id) DESC
        LIMIT 200
      `,
      prisma.$queryRaw<Array<{ id: string; title: string; slug: string | null; year: number }>>`
        SELECT m.id, m.title, m.slug, m.year
        FROM "Movie" m
        ORDER BY (SELECT COUNT(*) FROM "Performance" p WHERE p."movieId" = m.id) DESC
        LIMIT 200
      `
    ])

    const payload = { actors: actors || [], movies: movies || [] }
    await cacheSet(cacheKey, payload, PRELOAD_CACHE_TTL_SEC)

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=900')
    return res
  } catch (error) {
    console.error('Search preload failed:', error)
    return NextResponse.json({ error: 'Preload failed' }, { status: 500 })
  }
}
