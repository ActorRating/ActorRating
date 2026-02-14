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
const MIN_SIMILARITY = 0.2

/** Normalize and tokenize: trim, lowercase, split on whitespace. */
function tokenize(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim()
    if (!q || q.length < 1) {
      return NextResponse.json({ actors: [], movies: [] } as SuggestionsResponse)
    }

    const normalized = q.toLowerCase().trim()
    const cacheKey = makeCacheKey("search-suggestions-v2", [normalized])
    const cached = await cacheGet<SuggestionsResponse>(cacheKey)
    if (cached) {
      const res = NextResponse.json(cached)
      res.headers.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120")
      return res
    }

    const tokens = tokenize(q)
    const hasTokens = tokens.length > 0

    // Build AND condition: every token must appear in name/title (any order). Prefix-friendly.
    const actorTokenConditions = hasTokens
      ? tokens.map((t) => Prisma.sql`lower(a.name) LIKE ${"%" + t + "%"}`)
      : [Prisma.sql`false`]
    const movieTokenConditions = hasTokens
      ? tokens.map((t) => Prisma.sql`lower(m.title) LIKE ${"%" + t + "%"}`)
      : [Prisma.sql`false`]

    const actorWhere = hasTokens ? Prisma.join(actorTokenConditions, " AND ") : Prisma.sql`false`
    const movieWhere = hasTokens ? Prisma.join(movieTokenConditions, " AND ") : Prisma.sql`false`

    // Order by relevance: name starts with query > contains phrase > all tokens; then popularity
    const [actorRows, movieRows] = await Promise.all([
      prisma.$queryRaw<
        Array<{ id: string; name: string; slug: string | null; popularity: number }>
      >(Prisma.sql`
        SELECT a.id, a.name, a.slug,
               (SELECT COUNT(*)::int FROM "Performance" WHERE "actorId" = a.id) AS popularity
        FROM "Actor" a
        WHERE ${actorWhere}
        ORDER BY
          CASE WHEN lower(a.name) LIKE ${normalized + "%"} THEN 0
               WHEN lower(a.name) LIKE ${"%" + normalized + "%"} THEN 1
               ELSE 2 END,
          (SELECT COUNT(*) FROM "Performance" WHERE "actorId" = a.id) DESC,
          a.name ASC
        LIMIT ${LIMIT_ACTORS}
      `),
      prisma.$queryRaw<
        Array<{ id: string; title: string; slug: string | null; year: number | null; popularity: number }>
      >(Prisma.sql`
        SELECT m.id, m.title, m.slug, m.year,
               (SELECT COUNT(*)::int FROM "Performance" WHERE "movieId" = m.id) AS popularity
        FROM "Movie" m
        WHERE ${movieWhere}
        ORDER BY
          CASE WHEN lower(m.title) LIKE ${normalized + "%"} THEN 0
               WHEN lower(m.title) LIKE ${"%" + normalized + "%"} THEN 1
               ELSE 2 END,
          (SELECT COUNT(*) FROM "Performance" WHERE "movieId" = m.id) DESC,
          m.year DESC NULLS LAST,
          m.title ASC
        LIMIT ${LIMIT_MOVIES}
      `),
    ])

    let actors = (actorRows || []).map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
    }))
    let movies = (movieRows || []).map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      year: r.year ?? 0,
    }))

    // Fallback: if no token-match results and query length >= 2, use trigram similarity
    if (actors.length === 0 && movies.length === 0 && normalized.length >= 2) {
      const [fallbackActors, fallbackMovies] = await Promise.all([
        prisma.$queryRaw<
          Array<{ id: string; name: string; slug: string | null }>
        >(Prisma.sql`
          SELECT a.id, a.name, a.slug
          FROM "Actor" a
          WHERE similarity(lower(a.name), ${normalized}) > ${MIN_SIMILARITY}
          ORDER BY similarity(lower(a.name), ${normalized}) DESC,
                   (SELECT COUNT(*) FROM "Performance" WHERE "actorId" = a.id) DESC
          LIMIT ${LIMIT_ACTORS}
        `),
        prisma.$queryRaw<
          Array<{ id: string; title: string; slug: string | null; year: number | null }>
        >(Prisma.sql`
          SELECT m.id, m.title, m.slug, m.year
          FROM "Movie" m
          WHERE similarity(lower(m.title), ${normalized}) > ${MIN_SIMILARITY}
          ORDER BY similarity(lower(m.title), ${normalized}) DESC,
                   (SELECT COUNT(*) FROM "Performance" WHERE "movieId" = m.id) DESC,
                   m.year DESC NULLS LAST
          LIMIT ${LIMIT_MOVIES}
        `),
      ])
      actors = (fallbackActors || []).map((r) => ({ id: r.id, name: r.name, slug: r.slug }))
      movies = (fallbackMovies || []).map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        year: r.year ?? 0,
      }))
    }

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
