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
    console.log("🎭 Fetching actor with ID:", id)
    
    // Fetch actor data from Supabase
    const { data: actor, error: actorError } = await supabaseServer
      .from('Actor')
      .select('*')
      .eq('id', id)
      .single()

    if (actorError) {
      console.error("❌ Actor fetch error:", actorError)
      return NextResponse.json({ error: "Actor not found" }, { status: 404 })
    }

    console.log("🎭 Actor found:", actor.name)

    // Fetch performances for this actor
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
        movie:Movie(id, title, year, director, tmdbId)
      `)
      .eq('actorId', id)
      .order('updatedAt', { ascending: false })
      .limit(200)

    if (performancesError) {
      console.error("❌ Performances fetch error:", performancesError)
    }

    // Fetch ratings for this actor
    const { data: ratings, error: ratingsError } = await supabaseServer
      .from('Rating')
      .select(`
        movieId,
        weightedScore,
        emotionalRangeDepth,
        characterBelievability,
        technicalSkill,
        screenPresence,
        chemistryInteraction
      `)
      .eq('actorId', id)
      .order('createdAt', { ascending: false })
      .limit(1000)

    if (ratingsError) {
      console.error("❌ Ratings fetch error:", ratingsError)
    }

    // Combine the data
    const actorData = {
      ...actor,
      performances: performances || [],
      ratings: ratings || []
    }

    console.log("🎭 Returning actor data:", actorData.name, "with", (performances || []).length, "performances")
    
    return NextResponse.json(actorData)
  } catch (error) {
    console.error("❌ Error fetching actor:", error)
    return NextResponse.json(
      { error: "Failed to fetch actor" },
      { status: 500 }
    )
  }
}