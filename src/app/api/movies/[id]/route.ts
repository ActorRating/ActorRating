import { NextRequest, NextResponse } from "next/server"
import supabaseServer from "@/lib/supabaseServer"
import { resolveCharacterDisplay } from "@/lib/character"
import { getMovieCredits } from "@/lib/tmdb"

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

    // Fetch performances for this movie
    const { data: performances, error: performancesError } = await supabaseServer
      .from('Performance')
      .select(`
        id,
        userId,
        actorId,
        movieId,
        comment,
        createdAt,
        updatedAt,
        actor:Actor(id, name, imageUrl)
      `)
      .eq('movieId', id)
      .order('updatedAt', { ascending: false })
      .limit(200)

    if (performancesError) {
      console.error("❌ Performances fetch error:", performancesError)
    }

    // Fetch ratings for this movie
    const { data: ratings, error: ratingsError } = await supabaseServer
      .from('Rating')
      .select(`
        actorId,
        weightedScore,
        emotionalRangeDepth,
        characterBelievability,
        technicalSkill,
        screenPresence,
        chemistryInteraction
      `)
      .eq('movieId', id)
      .order('createdAt', { ascending: false })
      .limit(1000)

    if (ratingsError) {
      console.error("❌ Ratings fetch error:", ratingsError)
    }

    // Combine the data
    const movieData = {
      ...movie,
      performances: performances || [],
      ratings: ratings || []
    }

    console.log("🎬 Returning movie data:", movieData.title, "with", (performances || []).length, "performances")
    
    return NextResponse.json(movieData)
  } catch (error) {
    console.error("❌ Error fetching movie:", error)
    return NextResponse.json(
      { error: "Failed to fetch movie" },
      { status: 500 }
    )
  }
}