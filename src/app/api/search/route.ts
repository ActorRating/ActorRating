import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const suggestions = searchParams.get('suggestions') === 'true'
    
    // Query is required
    if (query === null || query === undefined) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      )
    }

    const searchTerm = query.trim()

    // Suggestions: allow 1+ characters; return empty for 0 characters
    if (suggestions) {
      if (searchTerm.length < 1) {
        return NextResponse.json({ actors: [], movies: [] })
      }
    } else {
      // Full search: require at least 2 characters
      if (searchTerm.length < 2) {
        return NextResponse.json(
          { error: "Query must be at least 2 characters long for full search" },
          { status: 400 }
        )
      }
    }

    // Cache key: normalized query + mode (suggestions vs full)
    const cacheKey = makeCacheKey('search', [searchTerm.toLowerCase(), suggestions ? 'suggestions' : 'full'])
    const cached = await cacheGet<{ actors: any[]; movies: any[] }>(cacheKey)
    if (cached) {
      const res = NextResponse.json(cached)
      res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
      return res
    }

    // Suggestions: weighted score (exact 100 + prefix 50 + word_start 25 + similarity*10), MIN_SIMILARITY 0.15. Limit 8.
    const normalizedTerm = searchTerm.toLowerCase()
    const MIN_SIMILARITY = 0.15
    if (suggestions) {
      const [actors, movies] = await Promise.all([
        prisma.$queryRaw<Array<{ id: string; name: string; slug: string | null }>>`
          SELECT sub.id, sub.name, sub.slug
          FROM (
            SELECT a.id, a.name, a.slug,
              (CASE WHEN lower(a.name) = ${normalizedTerm} THEN 100 ELSE 0 END
               + CASE WHEN lower(a.name) LIKE ${normalizedTerm + "%"} THEN 50 ELSE 0 END
               + CASE WHEN lower(a.name) LIKE ${normalizedTerm + "%"} OR lower(a.name) LIKE ${"%" + " " + normalizedTerm + "%"} THEN 25 ELSE 0 END
               + COALESCE(similarity(lower(a.name), ${normalizedTerm}), 0) * 10) AS score
            FROM "Actor" a
            WHERE lower(a.name) LIKE ${normalizedTerm + "%"}
               OR lower(a.name) LIKE ${"%" + " " + normalizedTerm + "%"}
               OR lower(a.name) LIKE ${"%" + normalizedTerm + "%"}
               OR (octet_length(${normalizedTerm}) >= 2 AND similarity(lower(a.name), ${normalizedTerm}) > ${MIN_SIMILARITY})
          ) sub
          ORDER BY sub.score DESC,
                   (SELECT COUNT(*) FROM "Performance" p WHERE p."actorId" = sub.id) DESC,
                   sub.name ASC
          LIMIT 8
        `,
        prisma.$queryRaw<Array<{ id: string; title: string; slug: string | null; year: number }>>`
          SELECT sub.id, sub.title, sub.slug, sub.year
          FROM (
            SELECT m.id, m.title, m.slug, m.year,
              (CASE WHEN lower(m.title) = ${normalizedTerm} THEN 100 ELSE 0 END
               + CASE WHEN lower(m.title) LIKE ${normalizedTerm + "%"} THEN 50 ELSE 0 END
               + CASE WHEN lower(m.title) LIKE ${normalizedTerm + "%"} OR lower(m.title) LIKE ${"%" + " " + normalizedTerm + "%"} THEN 25 ELSE 0 END
               + COALESCE(similarity(lower(m.title), ${normalizedTerm}), 0) * 10) AS score
            FROM "Movie" m
            WHERE lower(m.title) LIKE ${normalizedTerm + "%"}
               OR lower(m.title) LIKE ${"%" + " " + normalizedTerm + "%"}
               OR lower(m.title) LIKE ${"%" + normalizedTerm + "%"}
               OR (octet_length(${normalizedTerm}) >= 2 AND similarity(lower(m.title), ${normalizedTerm}) > ${MIN_SIMILARITY})
          ) sub
          ORDER BY sub.score DESC,
                   (SELECT COUNT(*) FROM "Performance" p WHERE p."movieId" = sub.id) DESC,
                   sub.year DESC NULLS LAST,
                   sub.title ASC
          LIMIT 8
        `
      ])

      const payload = {
        actors: actors || [],
        movies: movies || [],
      }
      await cacheSet(cacheKey, payload, 30)
      const res = NextResponse.json(payload)
      res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120')
      return res
    }

    // Full search: same weighted score (exact 100 + prefix 50 + word_start 25 + similarity*10), MIN_SIMILARITY 0.15. Limit 10.
    const [actors, movies] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string; name: string; slug: string | null }>>`
        SELECT sub.id, sub.name, sub.slug
        FROM (
          SELECT a.id, a.name, a.slug,
            (CASE WHEN lower(a.name) = ${normalizedTerm} THEN 100 ELSE 0 END
             + CASE WHEN lower(a.name) LIKE ${normalizedTerm + "%"} THEN 50 ELSE 0 END
             + CASE WHEN lower(a.name) LIKE ${normalizedTerm + "%"} OR lower(a.name) LIKE ${"%" + " " + normalizedTerm + "%"} THEN 25 ELSE 0 END
             + COALESCE(similarity(lower(a.name), ${normalizedTerm}), 0) * 10) AS score
          FROM "Actor" a
          WHERE lower(a.name) LIKE ${normalizedTerm + "%"}
             OR lower(a.name) LIKE ${"%" + " " + normalizedTerm + "%"}
             OR lower(a.name) LIKE ${"%" + normalizedTerm + "%"}
             OR (octet_length(${normalizedTerm}) >= 2 AND similarity(lower(a.name), ${normalizedTerm}) > ${MIN_SIMILARITY})
        ) sub
        ORDER BY sub.score DESC,
                 (SELECT COUNT(*) FROM "Performance" p WHERE p."actorId" = sub.id) DESC,
                 sub.name ASC
        LIMIT 10
      `,
      prisma.$queryRaw<Array<{ id: string; title: string; slug: string | null; year: number }>>`
        SELECT sub.id, sub.title, sub.slug, sub.year
        FROM (
          SELECT m.id, m.title, m.slug, m.year,
            (CASE WHEN lower(m.title) = ${normalizedTerm} THEN 100 ELSE 0 END
             + CASE WHEN lower(m.title) LIKE ${normalizedTerm + "%"} THEN 50 ELSE 0 END
             + CASE WHEN lower(m.title) LIKE ${normalizedTerm + "%"} OR lower(m.title) LIKE ${"%" + " " + normalizedTerm + "%"} THEN 25 ELSE 0 END
             + COALESCE(similarity(lower(m.title), ${normalizedTerm}), 0) * 10) AS score
          FROM "Movie" m
          WHERE lower(m.title) LIKE ${normalizedTerm + "%"}
             OR lower(m.title) LIKE ${"%" + " " + normalizedTerm + "%"}
             OR lower(m.title) LIKE ${"%" + normalizedTerm + "%"}
             OR (octet_length(${normalizedTerm}) >= 2 AND similarity(lower(m.title), ${normalizedTerm}) > ${MIN_SIMILARITY})
        ) sub
        ORDER BY sub.score DESC,
                 (SELECT COUNT(*) FROM "Performance" p WHERE p."movieId" = sub.id) DESC,
                 sub.year DESC NULLS LAST,
                 sub.title ASC
        LIMIT 10
      `
    ])

    const payload = { 
      actors: actors || [],
      movies: movies || []
    }
    
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