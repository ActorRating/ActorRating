import { NextRequest, NextResponse } from "next/server"
import supabaseServer from "@/lib/supabaseServer"
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

    // Search movies using Supabase
    const { data: movies, error: moviesError } = await supabaseServer
      .from('movies')
      .select('id, title, year')
      .ilike('title', `%${searchTerm}%`)
      .order('title')
      .limit(10)

    // Search actors using Supabase
    const { data: actors, error: actorsError } = await supabaseServer
      .from('actors')
      .select('id, name')
      .ilike('name', `%${searchTerm}%`)
      .order('name')
      .limit(10)

    // Handle errors
    if (moviesError) {
      console.error('Movies search error:', moviesError)
    }
    if (actorsError) {
      console.error('Actors search error:', actorsError)
    }

    const payload = { 
      movies: movies || [], 
      actors: actors || [] 
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