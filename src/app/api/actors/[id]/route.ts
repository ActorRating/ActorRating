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
    console.log("🎭 Fetching actor with ID or slug:", id)
    
    // Try to fetch by slug first, then fallback to ID
    let { data: actor, error: actorError } = await supabaseServer
      .from('Actor')
      .select('*')
      .eq('slug', id)
      .single()
    
    // If not found by slug, try by ID
    if (actorError || !actor) {
      const { data: actorById, error: idError } = await supabaseServer
        .from('Actor')
        .select('*')
        .eq('id', id)
        .single()
      
      if (idError || !actorById) {
        console.error("❌ Actor fetch error:", idError || actorError)
        return NextResponse.json({ error: "Actor not found" }, { status: 404 })
      }
      actor = actorById
      actorError = null
    }

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
        character,
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
        userId,
        movieId,
        roleName,
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

    // Create a map of rating data by (userId, movieId) for quick lookup
    const ratingMap = new Map<string, any>()
    if (ratings) {
      ratings.forEach(rating => {
        const key = `${rating.userId}:${rating.movieId}`
        ratingMap.set(key, rating)
      })
    }

    // Combine performances with their rating data
    const enrichedPerformances = (performances || []).map(performance => {
      const key = `${performance.userId}:${performance.movieId}`
      const rating = ratingMap.get(key)
      
      return {
        ...performance,
        roleName: rating?.roleName || null,
        // Add the rating scores to the performance for the frontend
        emotionalRangeDepth: rating?.emotionalRangeDepth || 0,
        characterBelievability: rating?.characterBelievability || 0,
        technicalSkill: rating?.technicalSkill || 0,
        screenPresence: rating?.screenPresence || 0,
        chemistryInteraction: rating?.chemistryInteraction || 0,
        // Add user info for display
        user: {
          name: `User ${performance.userId.slice(-4)}`, // Simple user display
          email: `user@example.com` // Placeholder
        }
      }
    })

    // Combine the data
    const actorData = {
      ...actor,
      performances: enrichedPerformances,
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