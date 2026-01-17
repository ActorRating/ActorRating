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
    const { searchParams } = new URL(request.url)
    const minimal = searchParams.get('minimal') === 'true'
    
    console.log("🎭 Fetching actor with ID or slug:", id, minimal ? "(minimal)" : "")
    
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
    
    // If minimal mode, return early with just basic info (much faster)
    if (minimal) {
      const res = NextResponse.json({
        id: actor.id,
        name: actor.name,
        imageUrl: actor.imageUrl,
        slug: actor.slug,
        createdAt: actor.createdAt,
        updatedAt: actor.updatedAt,
      })
      res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=1800')
      return res
    }

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
        movie:Movie(id, title, year, director, tmdbId, slug),
        actor:Actor(id, name, slug)
      `)
      .eq('actorId', actor.id)
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
      .eq('actorId', actor.id)
      .order('createdAt', { ascending: false })
      .limit(1000)

    if (ratingsError) {
      console.error("❌ Ratings fetch error:", ratingsError)
    }

    // Create a map of rating data by (actorId, movieId) for quick lookup
    // Also create a map to aggregate ratings by movie (for career score calculation)
    const ratingMap = new Map<string, any>()
    const ratingsByMovie = new Map<string, any[]>()
    
    if (ratings) {
      ratings.forEach(rating => {
        // Match by actorId:movieId (not userId:movieId) since ratings are per actor-movie pair
        const key = `${rating.movieId}`
        if (!ratingsByMovie.has(key)) {
          ratingsByMovie.set(key, [])
        }
        ratingsByMovie.get(key)!.push(rating)
        
        // For matching to specific performances, use movieId only
        // (since multiple users can rate the same actor-movie pair)
        if (!ratingMap.has(key)) {
          // Use the first rating found for this movie (or could average them)
          ratingMap.set(key, rating)
        }
      })
    }

    // Get all unique movies that have ratings
    const ratedMovieIds = new Set(ratings?.map(r => r.movieId) || [])
    
    // Fetch movie details for rated movies that might not have performances
    const { data: ratedMovies } = await supabaseServer
      .from('Movie')
      .select('id, title, year, director, slug')
      .in('id', Array.from(ratedMovieIds))
    
    // Create a map of existing performances by movieId
    const performanceMap = new Map<string, any>()
    if (performances) {
      performances.forEach(perf => {
        performanceMap.set(perf.movieId, perf)
      })
    }
    
    // Combine existing performances with their rating data
    const enrichedPerformances = (performances || []).map(performance => {
      const key = performance.movieId
      const rating = ratingMap.get(key)
      
      return {
        ...performance,
        roleName: rating?.roleName || null,
        // Add the rating scores to the performance for the frontend
        // Use the first rating found, or average if multiple exist
        emotionalRangeDepth: rating?.emotionalRangeDepth || 0,
        characterBelievability: rating?.characterBelievability || 0,
        technicalSkill: rating?.technicalSkill || 0,
        screenPresence: rating?.screenPresence || 0,
        chemistryInteraction: rating?.chemistryInteraction || 0,
        // Add user info for display
        user: {
          name: `User ${performance.userId?.slice(-4) || 'Unknown'}`, // Simple user display
          email: `user@example.com` // Placeholder
        }
      }
    })
    
    // Add performances for movies that have ratings but no performance entry
    if (ratedMovies) {
      ratedMovies.forEach(movie => {
        if (!performanceMap.has(movie.id)) {
          // Get the first rating for this movie to use as default
          const movieRatings = ratingsByMovie.get(movie.id) || []
          if (movieRatings.length > 0) {
            const firstRating = movieRatings[0]
            // Calculate average rating for this movie across all users
            const avgRating = {
              emotionalRangeDepth: Math.round(movieRatings.reduce((sum, r) => sum + (r.emotionalRangeDepth || 0), 0) / movieRatings.length),
              characterBelievability: Math.round(movieRatings.reduce((sum, r) => sum + (r.characterBelievability || 0), 0) / movieRatings.length),
              technicalSkill: Math.round(movieRatings.reduce((sum, r) => sum + (r.technicalSkill || 0), 0) / movieRatings.length),
              screenPresence: Math.round(movieRatings.reduce((sum, r) => sum + (r.screenPresence || 0), 0) / movieRatings.length),
              chemistryInteraction: Math.round(movieRatings.reduce((sum, r) => sum + (r.chemistryInteraction || 0), 0) / movieRatings.length),
            }
            
            enrichedPerformances.push({
              id: `rating-${movie.id}`,
              userId: firstRating.userId,
              actorId: actor.id,
              movieId: movie.id,
              comment: null,
              character: firstRating.roleName || null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              movie: movie,
              actor: { id: actor.id, name: actor.name, slug: actor.slug },
              roleName: firstRating.roleName || null,
              emotionalRangeDepth: avgRating.emotionalRangeDepth,
              characterBelievability: avgRating.characterBelievability,
              technicalSkill: avgRating.technicalSkill,
              screenPresence: avgRating.screenPresence,
              chemistryInteraction: avgRating.chemistryInteraction,
              user: {
                name: `User ${firstRating.userId?.slice(-4) || 'Unknown'}`,
                email: `user@example.com`
              }
            })
          }
        }
      })
    }

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