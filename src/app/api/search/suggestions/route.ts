export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"
import { getClientIp, isLikelyAbusiveBot } from "@/lib/requestProtection"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

/** Response shape for SearchBar: actors and movies (images for dropdown thumbnails). */
export type SuggestionsResponse = {
  actors: Array<{ id: string; name: string; slug: string | null; imageUrl: string | null }>
  movies: Array<{ id: string; title: string; slug: string | null; year: number; posterUrl: string | null }>
}

const CACHE_TTL = 60
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000

const searchCache = new Map<string, { data: SuggestionsResponse; expires: number }>()

const LIMIT_ACTORS = 8
const LIMIT_MOVIES = 5
const PREFIX_RETURN_THRESHOLD = 5
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 90
const ipRateWindow = new Map<string, { count: number; resetAt: number }>()

export async function GET(request: NextRequest) {
  const routeStart = Date.now()
  const isProd = process.env.NODE_ENV === "production"
  try {
    if (isLikelyAbusiveBot(request)) {
      return NextResponse.json({ actors: [], movies: [] } as SuggestionsResponse, { status: 403 })
    }

    const clientIp = getClientIp(request)
    const now = Date.now()
    const current = ipRateWindow.get(clientIp)
    if (!current || current.resetAt <= now) {
      ipRateWindow.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    } else {
      current.count += 1
      if (current.count > RATE_LIMIT_MAX_REQUESTS) {
        return NextResponse.json({ actors: [], movies: [] } as SuggestionsResponse, { status: 429 })
      }
    }

    const q = request.nextUrl.searchParams.get("q")?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json({ actors: [], movies: [] } as SuggestionsResponse)
    }

    const normalized = q.toLowerCase().trim()

    const memEntry = searchCache.get(normalized)
    if (memEntry && memEntry.expires > now) {
      const res = NextResponse.json(memEntry.data)
      res.headers.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120")
      if (!isProd) {
        console.log("Suggestions query time:", Date.now() - routeStart, "(memory cache hit)")
      }
      return res
    }
    if (memEntry) searchCache.delete(normalized)

    const cacheKey = makeCacheKey("search-suggestions-v7-images", [normalized])
    const cached = await cacheGet<SuggestionsResponse>(cacheKey)
    if (cached) {
      searchCache.set(normalized, { data: cached, expires: now + MEMORY_CACHE_TTL_MS })
      const res = NextResponse.json(cached)
      res.headers.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120")
      if (!isProd) {
        console.log("Suggestions query time:", Date.now() - routeStart, "(redis cache hit)")
      }
      return res
    }

    const prefixPattern = normalized + "%"
    const useSimilarity = normalized.length >= 3

    // --- Actors: prefix-first via Prisma; similarity via Postgres trigram if needed ---
    const actorsStart = Date.now()
    const actorPrefixRows = await prisma.actor.findMany({
      where: { name: { startsWith: normalized, mode: "insensitive" } },
      select: { id: true, name: true, slug: true, imageUrl: true },
      orderBy: { name: "asc" },
      take: LIMIT_ACTORS,
    })

    const actorList = Array.isArray(actorPrefixRows) ? actorPrefixRows : []
    let actors: Array<{ id: string; name: string; slug: string | null; imageUrl: string | null }>
    if (!useSimilarity || actorList.length >= PREFIX_RETURN_THRESHOLD) {
      actors = actorList.slice(0, LIMIT_ACTORS).map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug ?? null,
        imageUrl: (r as { imageUrl?: string | null }).imageUrl ?? null,
      }))
    } else {
      // Requires PostgreSQL pg_trgm extension for similarity(...).
      // Fallback behavior if pg_trgm is unavailable: catch block returns prefix-only matches.
      const similarityRows = await prisma.$queryRaw<
        Array<{ id: string; name: string; slug: string | null; imageUrl: string | null }>
      >(Prisma.sql`
        SELECT id, name, slug, "imageUrl"
        FROM "Actor"
        WHERE similarity(lower(name), ${normalized}) > 0.12
        ORDER BY similarity(lower(name), ${normalized}) DESC, name ASC
        LIMIT ${LIMIT_ACTORS}
      `)
      const simList = Array.isArray(similarityRows) ? similarityRows : []
      const seen = new Set(actorList.map((r) => r.id))
      const combined = actorList.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug ?? null,
        imageUrl: (r as { imageUrl?: string | null }).imageUrl ?? null,
      }))
      for (const r of simList) {
        if (!seen.has(r.id)) {
          seen.add(r.id)
          combined.push({
            id: r.id,
            name: r.name,
            slug: r.slug ?? null,
            imageUrl: (r as { imageUrl?: string | null }).imageUrl ?? null,
          })
        }
      }
      actors = combined.slice(0, LIMIT_ACTORS)
    }
    const actorsMs = Date.now() - actorsStart

    // --- Movies: prefix-first via Prisma; similarity via Postgres trigram if needed ---
    const moviesStart = Date.now()
    const moviePrefixRows = await prisma.movie.findMany({
      where: { title: { startsWith: normalized, mode: "insensitive" } },
      select: { id: true, title: true, slug: true, year: true, posterUrl: true },
      orderBy: { title: "asc" },
      take: LIMIT_MOVIES,
    })

    const movieList = Array.isArray(moviePrefixRows) ? moviePrefixRows : []
    let movies: Array<{
      id: string
      title: string
      slug: string | null
      year: number
      posterUrl: string | null
    }>
    if (!useSimilarity || movieList.length >= PREFIX_RETURN_THRESHOLD) {
      movies = movieList.slice(0, LIMIT_MOVIES).map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug ?? null,
        year: Number(r.year) ?? 0,
        posterUrl: (r as { posterUrl?: string | null }).posterUrl ?? null,
      }))
    } else {
      // Requires PostgreSQL pg_trgm extension for similarity(...).
      // Fallback behavior if pg_trgm is unavailable: catch block returns prefix-only matches.
      const similarityRows = await prisma.$queryRaw<
        Array<{ id: string; title: string; slug: string | null; year: number; posterUrl: string | null }>
      >(Prisma.sql`
        SELECT id, title, slug, year, "posterUrl"
        FROM "Movie"
        WHERE similarity(lower(title), ${normalized}) > 0.12
        ORDER BY similarity(lower(title), ${normalized}) DESC, title ASC
        LIMIT ${LIMIT_MOVIES}
      `)
      const simList = Array.isArray(similarityRows) ? similarityRows : []
      const seen = new Set(movieList.map((r) => r.id))
      const combined = movieList.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug ?? null,
        year: Number(r.year) ?? 0,
        posterUrl: (r as { posterUrl?: string | null }).posterUrl ?? null,
      }))
      for (const r of simList) {
        if (!seen.has(r.id)) {
          seen.add(r.id)
          combined.push({
            id: r.id,
            title: r.title,
            slug: r.slug ?? null,
            year: Number(r.year) ?? 0,
            posterUrl: (r as { posterUrl?: string | null }).posterUrl ?? null,
          })
        }
      }
      movies = combined.slice(0, LIMIT_MOVIES)
    }

    // Similarity rows may omit poster/image — hydrate from DB in one batch each
    const actorIdsMissing = actors.filter((a) => !a.imageUrl).map((a) => a.id)
    if (actorIdsMissing.length > 0) {
      const imgRows = await prisma.actor.findMany({
        where: { id: { in: actorIdsMissing } },
        select: { id: true, imageUrl: true },
      })
      const map = new Map(imgRows.map((row) => [row.id, row.imageUrl]))
      actors = actors.map((a) => (a.imageUrl ? a : { ...a, imageUrl: map.get(a.id) ?? null }))
    }
    const movieIdsMissing = movies.filter((m) => !m.posterUrl).map((m) => m.id)
    if (movieIdsMissing.length > 0) {
      const posterRows = await prisma.movie.findMany({
        where: { id: { in: movieIdsMissing } },
        select: { id: true, posterUrl: true },
      })
      const map = new Map(posterRows.map((row) => [row.id, row.posterUrl]))
      movies = movies.map((m) => (m.posterUrl ? m : { ...m, posterUrl: map.get(m.id) ?? null }))
    }
    const moviesMs = Date.now() - moviesStart

    const totalMs = Date.now() - routeStart
    if (!isProd) {
      console.log(
        `[suggestions] q="${normalized}" actors=${actorsMs}ms movies=${moviesMs}ms total=${totalMs}ms`
      )
      if (totalMs > 200) {
        console.warn(`[suggestions] SLOW: total ${totalMs}ms > 200ms for q="${normalized}"`)
      }
    }

    const payload: SuggestionsResponse = { actors, movies }
    searchCache.set(normalized, { data: payload, expires: Date.now() + MEMORY_CACHE_TTL_MS })
    await cacheSet(cacheKey, payload, CACHE_TTL)

    const res = NextResponse.json(payload)
    res.headers.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120")
    return res
  } catch (error) {
    console.error("Search suggestions failed:", error)
    const errMsg = error instanceof Error ? error.message.toLowerCase() : ""
    const isTrgmMissing = errMsg.includes("similarity(") || errMsg.includes("pg_trgm")
    if (isTrgmMissing) {
      try {
        const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase()
        if (q && q.length >= 2) {
          const [actors, movies] = await Promise.all([
            prisma.actor.findMany({
              where: { name: { startsWith: q, mode: "insensitive" } },
              select: { id: true, name: true, slug: true, imageUrl: true },
              orderBy: { name: "asc" },
              take: LIMIT_ACTORS,
            }),
            prisma.movie.findMany({
              where: { title: { startsWith: q, mode: "insensitive" } },
              select: { id: true, title: true, slug: true, year: true, posterUrl: true },
              orderBy: { title: "asc" },
              take: LIMIT_MOVIES,
            }),
          ])
          return NextResponse.json({ actors, movies } as SuggestionsResponse)
        }
      } catch (fallbackError) {
        console.error("Search suggestions pg_trgm fallback failed:", fallbackError)
      }
    }
    return NextResponse.json(
      { actors: [], movies: [] } as SuggestionsResponse,
      { status: 200 }
    )
  }
}
