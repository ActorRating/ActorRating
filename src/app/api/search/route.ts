import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    console.log("🔍 Search API called with query:", query)

    if (!query || query.trim().length < 2) {
      console.log("❌ Invalid query:", query)
      return NextResponse.json(
        { error: "Query parameter 'q' is required and must be at least 2 characters long" },
        { status: 400 }
      )
    }

    const searchTerm = query.trim()
    console.log("🔍 Processing search term:", searchTerm)

    // Cache key with short TTL to keep results hot without being stale
    const cacheKey = makeCacheKey('search', [searchTerm.toLowerCase()])
    const cached = await cacheGet<{ actors: any[] }>(cacheKey)
    if (cached) {
      const res = NextResponse.json(cached)
      res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
      return res
    }

    // Fuzzy search using PostgreSQL trigram similarity, full-text search, and ILIKE
    // This provides typo-tolerant search that handles:
    // - Exact matches (full-text search) - highest priority
    // - Similar matches (trigram similarity > 0.2) - handles typos
    // - Partial matches (ILIKE) - substring matches
    console.log("👤 Searching actors with fuzzy search for:", searchTerm)
    
    const actors = await prisma.$queryRaw<Array<{ id: string; name: string; slug: string | null }>>`
      WITH exact_matches AS (
        -- Full-text search (exact word matches) - highest priority
        SELECT id, name, slug, 1 as priority, similarity(name, ${searchTerm}) as sim
        FROM "Actor"
        WHERE to_tsvector('english', name) @@ plainto_tsquery('english', ${searchTerm})
      ),
      fuzzy_matches AS (
        -- Trigram similarity (fuzzy/typo-tolerant) - medium priority
        SELECT id, name, slug, 2 as priority, similarity(name, ${searchTerm}) as sim
        FROM "Actor"
        WHERE similarity(name, ${searchTerm}) > 0.2
          AND id NOT IN (SELECT id FROM exact_matches)
      ),
      partial_matches AS (
        -- ILIKE (partial substring matches) - lower priority
        SELECT id, name, slug, 3 as priority, similarity(name, ${searchTerm}) as sim
        FROM "Actor"
        WHERE name ILIKE ${`%${searchTerm}%`}
          AND id NOT IN (SELECT id FROM exact_matches)
          AND id NOT IN (SELECT id FROM fuzzy_matches)
      )
      SELECT id, name, slug
      FROM (
        SELECT * FROM exact_matches
        UNION ALL
        SELECT * FROM fuzzy_matches
        UNION ALL
        SELECT * FROM partial_matches
      ) combined
      ORDER BY priority ASC, sim DESC, name ASC
      LIMIT 10
    `

    console.log("👤 Actors results:", actors, "Count:", actors.length)

    const payload = { 
      actors: actors || [] 
    }
    
    console.log("📦 Final payload:", payload)
    console.log("📊 Total results - Actors:", (actors || []).length)
    
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