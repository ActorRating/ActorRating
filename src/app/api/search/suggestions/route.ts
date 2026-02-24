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
/** Use similarity() only when query length >= 3 to avoid expensive full scans. */
const MIN_QUERY_LENGTH_FOR_SIMILARITY = 3
const MIN_SIMILARITY = 0.15

/** Normalize and tokenize: trim, lowercase, split on whitespace. */
function tokenize(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

function scoreActorName(name: string, normalized: string, tokens: string[]): number {
  const lower = name.toLowerCase()
  if (lower === normalized) return 100
  if (lower.startsWith(normalized)) return 50
  const wordStarts = tokens.every((t) => lower.includes(t) && lower.split(/\s+/).some((w) => w.startsWith(t)))
  if (wordStarts) return 25
  if (tokens.every((t) => lower.includes(t))) return 10
  return 0
}

function scoreMovieTitle(title: string, normalized: string, tokens: string[]): number {
  const lower = title.toLowerCase()
  if (lower === normalized) return 100
  if (lower.startsWith(normalized)) return 50
  const wordStarts = tokens.every((t) => lower.includes(t) && lower.split(/\s+/).some((w) => w.startsWith(t)))
  if (wordStarts) return 25
  if (tokens.every((t) => lower.includes(t))) return 10
  return 0
}

export async function GET(request: NextRequest) {
  const routeStart = Date.now()
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim()
    // Temporary: log every suggestions API hit with user-agent to detect bot abuse
    const ua = request.headers.get("user-agent") ?? ""
    if (process.env.NODE_ENV === "production") {
      console.log("[Suggestions]", { q: q ?? "(empty)", userAgent: ua.slice(0, 120) })
    }
    if (!q || q.length < 1) {
      return NextResponse.json({ actors: [], movies: [] } as SuggestionsResponse)
    }

    const normalized = q.toLowerCase().trim()
    const cacheKey = makeCacheKey("search-suggestions-v4", [normalized])
    const cached = await cacheGet<SuggestionsResponse>(cacheKey)
    if (cached) {
      const res = NextResponse.json(cached)
      res.headers.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120")
      return res
    }

    const tokens = tokenize(q)
    const useSimilarity = normalized.length >= MIN_QUERY_LENGTH_FOR_SIMILARITY

    // --- Actors: prefix-first (index-friendly), then similarity only if query length >= 3 ---
    const actorsStart = Date.now()
    const prefixPattern = normalized + "%"

    // Phase 1: prefix match using index on lower(name) – single condition, no OR
    const actorPrefixRows = await prisma.$queryRaw<
      Array<{ id: string; name: string; slug: string | null }>
    >(Prisma.sql`
      SELECT a.id, a.name, a.slug
      FROM "Actor" a
      WHERE lower(a.name) LIKE ${prefixPattern}
      ORDER BY lower(a.name)
      LIMIT 50
    `)

    let actorRows: Array<{ id: string; name: string; slug: string | null; score: number }> = actorPrefixRows.map(
      (r) => ({
        ...r,
        score: scoreActorName(r.name, normalized, tokens),
      })
    )

    const actorIdsFromPrefix = new Set(actorRows.map((r) => r.id))

    // Phase 2: token match (all tokens in name) for multi-word query – get more candidates, exclude in JS
    if (tokens.length > 0 && actorRows.length < 50) {
      const tokenConditions = tokens.map((t) => Prisma.sql`lower(a.name) LIKE ${"%" + t + "%"}`)
      const tokenWhere = Prisma.join(tokenConditions, " AND ")
      const actorTokenRows = await prisma.$queryRaw<
        Array<{ id: string; name: string; slug: string | null }>
      >(Prisma.sql`
        SELECT a.id, a.name, a.slug
        FROM "Actor" a
        WHERE (${tokenWhere})
        ORDER BY (SELECT COUNT(*) FROM "Performance" p WHERE p."actorId" = a.id) DESC, a.name
        LIMIT 80
      `)
      for (const r of actorTokenRows) {
        if (actorIdsFromPrefix.has(r.id)) continue
        actorIdsFromPrefix.add(r.id)
        actorRows.push({ ...r, score: scoreActorName(r.name, normalized, tokens) })
        if (actorRows.length >= 50) break
      }
    }

    // Phase 3: similarity only when query length >= 3; exclude already-seen ids in JS
    if (useSimilarity && actorRows.length < 50) {
      const similarityRows = await prisma.$queryRaw<
        Array<{ id: string; name: string; slug: string | null; sim: number }>
      >(Prisma.sql`
        SELECT a.id, a.name, a.slug,
          similarity(lower(a.name), ${normalized}) AS sim
        FROM "Actor" a
        WHERE similarity(lower(a.name), ${normalized}) > ${MIN_SIMILARITY}
        ORDER BY sim DESC, (SELECT COUNT(*) FROM "Performance" p WHERE p."actorId" = a.id) DESC, a.name
        LIMIT 80
      `)
      for (const r of similarityRows) {
        if (actorIdsFromPrefix.has(r.id)) continue
        actorIdsFromPrefix.add(r.id)
        actorRows.push({
          id: r.id,
          name: r.name,
          slug: r.slug,
          score: r.sim * 10,
        })
        if (actorRows.length >= 50) break
      }
    }

    actorRows.sort((a, b) => b.score - a.score || 0)
    const actors = actorRows.slice(0, LIMIT_ACTORS).map(({ id, name, slug }) => ({ id, name, slug }))
    const actorsMs = Date.now() - actorsStart

    // --- Movies: same pattern ---
    const moviesStart = Date.now()
    const moviePrefixRows = await prisma.$queryRaw<
      Array<{ id: string; title: string; slug: string | null; year: number | null }>
    >(Prisma.sql`
      SELECT m.id, m.title, m.slug, m.year
      FROM "Movie" m
      WHERE lower(m.title) LIKE ${prefixPattern}
      ORDER BY lower(m.title)
      LIMIT 50
    `)

    let movieRows: Array<{
      id: string
      title: string
      slug: string | null
      year: number | null
      score: number
    }> = moviePrefixRows.map((r) => ({
      ...r,
      score: scoreMovieTitle(r.title, normalized, tokens),
    }))

    const movieIdsFromPrefix = new Set(movieRows.map((r) => r.id))

    if (tokens.length > 0 && movieRows.length < 50) {
      const tokenConditions = tokens.map((t) => Prisma.sql`lower(m.title) LIKE ${"%" + t + "%"}`)
      const tokenWhere = Prisma.join(tokenConditions, " AND ")
      const movieTokenRows = await prisma.$queryRaw<
        Array<{ id: string; title: string; slug: string | null; year: number | null }>
      >(Prisma.sql`
        SELECT m.id, m.title, m.slug, m.year
        FROM "Movie" m
        WHERE (${tokenWhere})
        ORDER BY (SELECT COUNT(*) FROM "Performance" p WHERE p."movieId" = m.id) DESC, m.year DESC NULLS LAST, m.title
        LIMIT 80
      `)
      for (const r of movieTokenRows) {
        if (movieIdsFromPrefix.has(r.id)) continue
        movieIdsFromPrefix.add(r.id)
        movieRows.push({ ...r, score: scoreMovieTitle(r.title, normalized, tokens) })
        if (movieRows.length >= 50) break
      }
    }

    if (useSimilarity && movieRows.length < 50) {
      const movieSimilarityRows = await prisma.$queryRaw<
        Array<{ id: string; title: string; slug: string | null; year: number | null; sim: number }>
      >(Prisma.sql`
        SELECT m.id, m.title, m.slug, m.year,
          similarity(lower(m.title), ${normalized}) AS sim
        FROM "Movie" m
        WHERE similarity(lower(m.title), ${normalized}) > ${MIN_SIMILARITY}
        ORDER BY sim DESC, (SELECT COUNT(*) FROM "Performance" p WHERE p."movieId" = m.id) DESC, m.year DESC NULLS LAST, m.title
        LIMIT 80
      `)
      for (const r of movieSimilarityRows) {
        if (movieIdsFromPrefix.has(r.id)) continue
        movieIdsFromPrefix.add(r.id)
        movieRows.push({
          id: r.id,
          title: r.title,
          slug: r.slug,
          year: r.year,
          score: r.sim * 10,
        })
        if (movieRows.length >= 50) break
      }
    }

    movieRows.sort((a, b) => b.score - a.score || 0)
    const movies = movieRows.slice(0, LIMIT_MOVIES).map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      year: r.year ?? 0,
    }))
    const moviesMs = Date.now() - moviesStart

    const totalMs = Date.now() - routeStart
    console.log(
      `[suggestions] q="${normalized}" actors=${actorsMs}ms movies=${moviesMs}ms total=${totalMs}ms`
    )
    if (totalMs > 150) {
      console.warn(`[suggestions] SLOW: total ${totalMs}ms > 150ms for q="${normalized}"`)
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
