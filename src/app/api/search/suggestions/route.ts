import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"

/** Response shape for SearchBar: actors and movies. */
export type SuggestionsResponse = {
  actors: Array<{ id: string; name: string; slug: string | null }>
  movies: Array<{ id: string; title: string; slug: string | null; year: number }>
}

const CACHE_TTL = 60
const LIMIT_ACTORS = 8
const LIMIT_MOVIES = 8
/** Lower threshold for better typo tolerance (e.g. "kelly gramer" → Kelsey Grammer). */
const MIN_SIMILARITY = 0.15

/** Normalize and tokenize: trim, lowercase, split on whitespace. */
function tokenize(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Ranking: score = (exact ? 100 : 0) + (prefix ? 50 : 0) + (word_start ? 25 : 0) + (similarity * 10).
 * Order by score DESC so exact > prefix > word-start > similarity > ILIKE fallback.
 */

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim()
    if (!q || q.length < 1) {
      return NextResponse.json({ actors: [], movies: [] } as SuggestionsResponse)
    }

    const normalized = q.toLowerCase().trim()
    const cacheKey = makeCacheKey("search-suggestions-v3", [normalized])
    const cached = await cacheGet<SuggestionsResponse>(cacheKey)
    if (cached) {
      const res = NextResponse.json(cached)
      res.headers.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120")
      return res
    }

    const tokens = tokenize(q)
    const hasTokens = tokens.length > 0

    // Candidate condition: token AND match OR trigram similarity > 0.15 OR ILIKE fallback
    const actorTokenConditions = hasTokens
      ? tokens.map((t) => Prisma.sql`lower(a.name) LIKE ${"%" + t + "%"}`)
      : [Prisma.sql`false`]
    const movieTokenConditions = hasTokens
      ? tokens.map((t) => Prisma.sql`lower(m.title) LIKE ${"%" + t + "%"}`)
      : [Prisma.sql`false`]

    const actorTokenWhere = hasTokens ? Prisma.join(actorTokenConditions, " AND ") : Prisma.sql`false`
    const movieTokenWhere = hasTokens ? Prisma.join(movieTokenConditions, " AND ") : Prisma.sql`false`

    const [actorRows, movieRows] = await Promise.all([
      prisma.$queryRaw<
        Array<{ id: string; name: string; slug: string | null }>
      >(Prisma.sql`
        SELECT sub.id, sub.name, sub.slug
        FROM (
          SELECT a.id, a.name, a.slug,
            (CASE WHEN lower(a.name) = ${normalized} THEN 100 ELSE 0 END
             + CASE WHEN lower(a.name) LIKE ${normalized + "%"} THEN 50 ELSE 0 END
             + CASE WHEN lower(a.name) LIKE ${normalized + "%"} OR lower(a.name) LIKE ${"%" + " " + normalized + "%"} THEN 25 ELSE 0 END
             + COALESCE(similarity(lower(a.name), ${normalized}), 0) * 10) AS score
          FROM "Actor" a
          WHERE (${actorTokenWhere})
             OR (octet_length(${normalized}) >= 2 AND similarity(lower(a.name), ${normalized}) > ${MIN_SIMILARITY})
             OR lower(a.name) LIKE ${"%" + normalized + "%"}
        ) sub
        ORDER BY sub.score DESC,
                 (SELECT COUNT(*) FROM "Performance" p WHERE p."actorId" = sub.id) DESC,
                 sub.name ASC
        LIMIT ${LIMIT_ACTORS}
      `),
      prisma.$queryRaw<
        Array<{ id: string; title: string; slug: string | null; year: number | null }>
      >(Prisma.sql`
        SELECT sub.id, sub.title, sub.slug, sub.year
        FROM (
          SELECT m.id, m.title, m.slug, m.year,
            (CASE WHEN lower(m.title) = ${normalized} THEN 100 ELSE 0 END
             + CASE WHEN lower(m.title) LIKE ${normalized + "%"} THEN 50 ELSE 0 END
             + CASE WHEN lower(m.title) LIKE ${normalized + "%"} OR lower(m.title) LIKE ${"%" + " " + normalized + "%"} THEN 25 ELSE 0 END
             + COALESCE(similarity(lower(m.title), ${normalized}), 0) * 10) AS score
          FROM "Movie" m
          WHERE (${movieTokenWhere})
             OR (octet_length(${normalized}) >= 2 AND similarity(lower(m.title), ${normalized}) > ${MIN_SIMILARITY})
             OR lower(m.title) LIKE ${"%" + normalized + "%"}
        ) sub
        ORDER BY sub.score DESC,
                 (SELECT COUNT(*) FROM "Performance" p WHERE p."movieId" = sub.id) DESC,
                 sub.year DESC NULLS LAST,
                 sub.title ASC
        LIMIT ${LIMIT_MOVIES}
      `),
    ])

    const actors = (actorRows || []).map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
    }))
    const movies = (movieRows || []).map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      year: r.year ?? 0,
    }))

    const payload: SuggestionsResponse = { actors, movies }
    await cacheSet(cacheKey, payload, CACHE_TTL)

    const res = NextResponse.json(payload)
    res.headers.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120")
    return res
  } catch (error) {
    console.error("Search suggestions failed:", error)
    return NextResponse.json(
      { actors: [], movies: [] } as SuggestionsResponse,
      { status: 200 }
    )
  }
}
