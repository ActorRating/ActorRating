import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"

const PRELOAD_CACHE_TTL_SEC = 600 // 10 minutes

type PreloadPayload = {
  actors: { id: string; name: string; slug: string | null }[]
  movies: { id: string; title: string; slug: string | null; year: number }[]
}

export async function GET() {
  const cacheKey = makeCacheKey('search-preload-v2', [])

  // Try cache first; if Redis is misconfigured or down, skip cache and hit DB
  let cached: PreloadPayload | null = null
  try {
    cached = await cacheGet<PreloadPayload>(cacheKey)
  } catch (cacheErr) {
    console.warn('Search preload cache get failed (using DB):', cacheErr)
  }

  if (cached) {
    const res = NextResponse.json(cached)
    res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=900')
    return res
  }

  try {
    // Discovery order: actual popularity by ratingsCount DESC, then averageRating DESC, then name/title. Only entities with at least one rating. Limit 50 each.
    const [actors, movies] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string; name: string; slug: string | null }>>`
        SELECT a.id, a.name, a.slug
        FROM "Actor" a
        WHERE (SELECT COUNT(*) FROM "Rating" r WHERE r."actorId" = a.id) > 0
        ORDER BY
          (SELECT COUNT(*) FROM "Rating" r WHERE r."actorId" = a.id) DESC,
          (SELECT AVG(r."weightedScore") FROM "Rating" r WHERE r."actorId" = a.id) DESC NULLS LAST,
          a.name ASC
        LIMIT 50
      `,
      prisma.$queryRaw<Array<{ id: string; title: string; slug: string | null; year: number }>>`
        SELECT m.id, m.title, m.slug, m.year
        FROM "Movie" m
        WHERE (SELECT COUNT(*) FROM "Rating" r WHERE r."movieId" = m.id) > 0
        ORDER BY
          (SELECT COUNT(*) FROM "Rating" r WHERE r."movieId" = m.id) DESC,
          (SELECT AVG(r."weightedScore") FROM "Rating" r WHERE r."movieId" = m.id) DESC NULLS LAST,
          m.title ASC
        LIMIT 50
      `
    ])

    const payload: PreloadPayload = { actors: actors ?? [], movies: movies ?? [] }

    try {
      await cacheSet(cacheKey, payload, PRELOAD_CACHE_TTL_SEC)
    } catch (cacheErr) {
      console.warn('Search preload cache set failed (response still OK):', cacheErr)
    }

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=900')
    return res
  } catch (error) {
    console.error('Search preload failed:', error)
    // Return 200 with empty data so the client doesn't break; search will work without preload
    const res = NextResponse.json({ actors: [], movies: [] } as PreloadPayload)
    res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=120')
    return res
  }
}
