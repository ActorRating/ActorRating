import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"
import { getClientIp, isLikelyAbusiveBot } from "@/lib/requestProtection"

export const runtime = "edge"

/**
 * Requires Supabase RPCs: search_actors_similarity(term), search_movies_similarity(term).
 * Run the SQL in docs/SUGGESTIONS_RPC_MANUAL_MIGRATION.md in Supabase SQL Editor before testing.
 * Without it, prefix search works but similarity fallback fails → incomplete results.
 */

/** Response shape for SearchBar: actors and movies. */
export type SuggestionsResponse = {
  actors: Array<{ id: string; name: string; slug: string | null }>
  movies: Array<{ id: string; title: string; slug: string | null; year: number }>
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

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase env for suggestions")
  return createClient(url, key)
}

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

    const cacheKey = makeCacheKey("search-suggestions-v6", [normalized])
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

    const supabase = getSupabase()
    const prefixPattern = normalized + "%"
    const useSimilarity = normalized.length >= 3

    // --- Actors: prefix-first via Supabase; similarity via RPC if needed ---
    const actorsStart = Date.now()
    const { data: actorPrefixRows = [] } = await supabase
      .from("Actor")
      .select("id,name,slug")
      .ilike("name", prefixPattern)
      .order("name", { ascending: true })
      .limit(LIMIT_ACTORS)

    const actorList = Array.isArray(actorPrefixRows) ? actorPrefixRows : []
    let actors: Array<{ id: string; name: string; slug: string | null }>
    if (!useSimilarity || actorList.length >= PREFIX_RETURN_THRESHOLD) {
      actors = actorList.slice(0, LIMIT_ACTORS).map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug ?? null,
      }))
    } else {
      const { data: similarityRows = [] } = await supabase.rpc("search_actors_similarity", {
        term: normalized,
      })
      const simList = Array.isArray(similarityRows) ? similarityRows : []
      const seen = new Set(actorList.map((r) => r.id))
      const combined = actorList.map((r) => ({ id: r.id, name: r.name, slug: r.slug ?? null }))
      for (const r of simList) {
        if (!seen.has(r.id)) {
          seen.add(r.id)
          combined.push({ id: r.id, name: r.name, slug: r.slug ?? null })
        }
      }
      actors = combined.slice(0, LIMIT_ACTORS)
    }
    const actorsMs = Date.now() - actorsStart

    // --- Movies: prefix-first via Supabase; similarity via RPC if needed ---
    const moviesStart = Date.now()
    const { data: moviePrefixRows = [] } = await supabase
      .from("Movie")
      .select("id,title,slug,year")
      .ilike("title", prefixPattern)
      .order("title", { ascending: true })
      .limit(LIMIT_MOVIES)

    const movieList = Array.isArray(moviePrefixRows) ? moviePrefixRows : []
    let movies: Array<{ id: string; title: string; slug: string | null; year: number }>
    if (!useSimilarity || movieList.length >= PREFIX_RETURN_THRESHOLD) {
      movies = movieList.slice(0, LIMIT_MOVIES).map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug ?? null,
        year: Number(r.year) ?? 0,
      }))
    } else {
      const { data: similarityRows = [] } = await supabase.rpc("search_movies_similarity", {
        term: normalized,
      })
      const simList = Array.isArray(similarityRows) ? similarityRows : []
      const seen = new Set(movieList.map((r) => r.id))
      const combined = movieList.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug ?? null,
        year: Number(r.year) ?? 0,
      }))
      for (const r of simList) {
        if (!seen.has(r.id)) {
          seen.add(r.id)
          combined.push({
            id: r.id,
            title: r.title,
            slug: r.slug ?? null,
            year: Number(r.year) ?? 0,
          })
        }
      }
      movies = combined.slice(0, LIMIT_MOVIES)
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
    return NextResponse.json(
      { actors: [], movies: [] } as SuggestionsResponse,
      { status: 200 }
    )
  }
}
