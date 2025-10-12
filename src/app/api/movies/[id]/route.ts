import { NextRequest, NextResponse } from "next/server"
import supabaseServer from "@/lib/supabaseServer"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log("🎬 Fetching movie with ID:", id)
    
    // Fetch movie data from Supabase
    const { data: movie, error: movieError } = await supabaseServer
      .from('Movie')
      .select('*')
      .eq('id', id)
      .single()

    if (movieError) {
      console.error("❌ Movie fetch error:", movieError)
      return NextResponse.json({ error: "Movie not found" }, { status: 404 })
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
