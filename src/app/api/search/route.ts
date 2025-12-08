import { NextRequest, NextResponse } from "next/server"
import supabaseServer from "@/lib/supabaseServer"
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

    // Search actors using Supabase - include slug for URL generation
    console.log("👤 Searching actors for:", searchTerm)
    const { data: actors, error: actorsError } = await supabaseServer
      .from('Actor')
      .select('id, name, slug')
      .ilike('name', `%${searchTerm}%`)
      .order('name')
      .limit(10)

    console.log("👤 Actors results:", actors, "Error:", actorsError)

    // Handle errors
    if (actorsError) {
      console.error('❌ Actors search error:', actorsError)
    }

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