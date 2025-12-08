import { NextRequest, NextResponse } from "next/server"
import supabaseServer from "@/lib/supabaseServer"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log("🎬 Fetching movie with ID or slug:", id)
    
    // Try to fetch by slug first, then fallback to ID
    let { data: movie, error: movieError } = await supabaseServer
      .from('Movie')
      .select('*')
      .eq('slug', id)
      .single()
    
    // If not found by slug, try by ID (backwards compatibility)
    if (movieError || !movie) {
      const { data: movieById, error: idError } = await supabaseServer
        .from('Movie')
        .select('*')
        .eq('id', id)
        .single()
      
      if (idError || !movieById) {
        console.error("❌ Movie fetch error:", idError || movieError)
        return NextResponse.json({ error: "Movie not found" }, { status: 404 })
      }
      movie = movieById
      movieError = null
    }

    console.log("🎬 Movie found:", movie.title)

    const res = NextResponse.json(movie)
    res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=1800')
    return res
  } catch (error) {
    console.error("Error fetching movie:", error)
    return NextResponse.json(
      { error: "Failed to fetch movie" },
      { status: 500 }
    )
  }
}
