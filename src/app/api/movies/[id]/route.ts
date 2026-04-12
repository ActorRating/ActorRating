export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabaseServer"
import { isAdultContentMovie, isAdultContentSlug } from "@/lib/adult-content-filter"
import { isJunkMovieSlug, isAllowedMovieSlug } from "@/lib/junk-movie-slugs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isProd = process.env.NODE_ENV === "production"
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const minimal = searchParams.get('minimal') === 'true'
    
    if (!isProd) {
      console.log("🎬 Fetching movie with ID or slug:", id, minimal ? "(minimal)" : "")
    }
    
    // Try to fetch by slug first, then fallback to ID
    let { data: movie, error: movieError } = await getSupabaseServiceRoleClient()
      .from('Movie')
      .select('*')
      .eq('slug', id)
      .single()

    // If not found by slug, try by ID (backwards compatibility)
    if (movieError || !movie) {
      const { data: movieById, error: idError } = await getSupabaseServiceRoleClient()
        .from('Movie')
        .select('*')
        .eq('id', id)
        .single()
      
      if (idError || !movieById) {
        console.error("❌ Movie fetch error:", idError || movieError)
        return NextResponse.json({ error: "Movie not found" }, { status: 410 })
      }
      movie = movieById
      movieError = null
    }

    if (movieError) {
      console.error("❌ Movie fetch error:", movieError)
      return NextResponse.json({ error: "Movie not found" }, { status: 410 })
    }

    const slug = movie.slug ?? id
    // Allowlist: never block these slugs (e.g. The Naked Gun)
    if (!isAllowedMovieSlug(slug)) {
      if (isJunkMovieSlug(slug)) {
        return NextResponse.json({ error: "Movie not found" }, { status: 410 })
      }
      if (isAdultContentMovie({ title: movie.title, genre: movie.genre ?? null, overview: movie.overview ?? null })) {
        return NextResponse.json({ error: "Movie not found" }, { status: 410 })
      }
      if (isAdultContentSlug(slug)) {
        return NextResponse.json({ error: "Movie not found" }, { status: 410 })
      }
    }

    if (!isProd) {
      console.log("🎬 Movie found:", movie.title)
    }
    
    // If minimal mode, return early with just basic info (much faster)
    if (minimal) {
      const res = NextResponse.json({
        id: movie.id,
        title: movie.title,
        year: movie.year,
        slug: movie.slug,
        posterUrl: movie.posterUrl ?? null,
        createdAt: movie.createdAt,
        updatedAt: movie.updatedAt,
      })
      res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=1800')
      return res
    }

    // Fetch performances and ratings in parallel for better performance
    const [performancesResult, ratingsResult] = await Promise.all([
      getSupabaseServiceRoleClient()
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
          actor:Actor(id, name, slug, imageUrl)
        `)
        .eq('movieId', movie.id)
        .order('updatedAt', { ascending: false })
        .limit(200),
      getSupabaseServiceRoleClient()
        .from('Rating')
        .select(`
          userId,
          actorId,
          movieId,
          roleName,
          weightedScore,
          emotionalRangeDepth,
          characterBelievability,
          technicalSkill,
          screenPresence,
          chemistryInteraction
        `)
        .eq('movieId', movie.id)
        .order('createdAt', { ascending: false })
        .limit(1000)
    ])

    const { data: performances, error: performancesError } = performancesResult
    const { data: ratings, error: ratingsError } = ratingsResult

    if (performancesError) {
      console.error("❌ Performances fetch error:", performancesError)
    }

    if (ratingsError) {
      console.error("❌ Ratings fetch error:", ratingsError)
    }

    // Aggregate ratings per actor; compute averaged criteria so community score is accurate.
    const ratingsByActor = new Map<string, any[]>()
    if (ratings) {
      ratings.forEach(rating => {
        if (!ratingsByActor.has(rating.actorId)) ratingsByActor.set(rating.actorId, [])
        ratingsByActor.get(rating.actorId)!.push(rating)
      })
    }

    // Build ratingMap with averaged criteria values per actor (fixes score discrepancy
    // — without this, enrichedPerformances used only the first rating's individual values).
    const ratingMap = new Map<string, any>()
    ratingsByActor.forEach((actorRatings, actorId) => {
      const count = actorRatings.length
      const first = actorRatings[0]
      const avg = (field: string) =>
        Math.round(actorRatings.reduce((s, r) => s + (r[field] || 0), 0) / count)
      ratingMap.set(`${actorId}:${movie.id}`, {
        roleName: first.roleName,
        emotionalRangeDepth: avg('emotionalRangeDepth'),
        characterBelievability: avg('characterBelievability'),
        technicalSkill: avg('technicalSkill'),
        screenPresence: avg('screenPresence'),
        chemistryInteraction: avg('chemistryInteraction'),
        ratingCount: count,
      })
    })

    // Get all unique actors that have ratings but no performance entry
    const ratedActorIds = new Set(ratings?.map(r => r.actorId) || [])
    const performanceActorIds = new Set(performances?.map(p => p.actorId) || [])
    const actorsNeedingFetch = Array.from(ratedActorIds).filter(id => !performanceActorIds.has(id))
    
    // Only fetch actor details if there are actors with ratings but no performances
    let ratedActors: any[] = []
    if (actorsNeedingFetch.length > 0) {
      const { data } = await getSupabaseServiceRoleClient()
        .from('Actor')
        .select('id, name, slug, imageUrl')
        .in('id', actorsNeedingFetch)
      ratedActors = data || []
    }
    
    // One performance per actor: DB can return multiple rows per actor (system + per-user). Prefer one with rating, then latest.
    const byActor = new Map<string, any>()
    ;(performances || []).forEach(perf => {
      const aid = perf.actorId
      const hasRating = ratingMap.has(`${aid}:${perf.movieId}`)
      const existing = byActor.get(aid)
      if (!existing) {
        byActor.set(aid, perf)
        return
      }
      const existingHasRating = ratingMap.has(`${existing.actorId}:${existing.movieId}`)
      if (hasRating && !existingHasRating) {
        byActor.set(aid, perf)
        return
      }
      if (hasRating && existingHasRating && new Date(perf.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        byActor.set(aid, perf)
        return
      }
      if (!hasRating && !existingHasRating && new Date(perf.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        byActor.set(aid, perf)
      }
    })
    const uniquePerformances = Array.from(byActor.values())

    // Map used to avoid adding duplicate synthetic performances for rated actors
    const performanceMap = new Map<string, any>()
    uniquePerformances.forEach(perf => {
      performanceMap.set(perf.actorId, perf)
    })

    // Combine existing performances with their rating data
    const enrichedPerformances = uniquePerformances.map(performance => {
      const key = `${performance.actorId}:${performance.movieId}`
      const rating = ratingMap.get(key)
      
      return {
        ...performance,
        roleName: rating?.roleName || null,
        emotionalRangeDepth: rating?.emotionalRangeDepth || 0,
        characterBelievability: rating?.characterBelievability || 0,
        technicalSkill: rating?.technicalSkill || 0,
        screenPresence: rating?.screenPresence || 0,
        chemistryInteraction: rating?.chemistryInteraction || 0,
        ratingCount: rating?.ratingCount || 0,
      }
    })
    
    // Add performances for actors that have ratings but no performance entry
    if (ratedActors && Array.isArray(ratedActors)) {
      ratedActors.forEach((actorItem: any) => {
        if (!performanceMap.has(actorItem.id)) {
          // Get the first rating for this actor to use as default
          const actorRatings = ratingsByActor.get(actorItem.id) || []
          if (actorRatings.length > 0) {
            const firstRating = actorRatings[0]
            // Calculate average rating for this actor across all users
            const avgRating = {
              emotionalRangeDepth: Math.round(actorRatings.reduce((sum: number, r: any) => sum + (r.emotionalRangeDepth || 0), 0) / actorRatings.length),
              characterBelievability: Math.round(actorRatings.reduce((sum: number, r: any) => sum + (r.characterBelievability || 0), 0) / actorRatings.length),
              technicalSkill: Math.round(actorRatings.reduce((sum: number, r: any) => sum + (r.technicalSkill || 0), 0) / actorRatings.length),
              screenPresence: Math.round(actorRatings.reduce((sum: number, r: any) => sum + (r.screenPresence || 0), 0) / actorRatings.length),
              chemistryInteraction: Math.round(actorRatings.reduce((sum: number, r: any) => sum + (r.chemistryInteraction || 0), 0) / actorRatings.length),
            }
            
            const newPerformance: any = {
              id: `rating-${actorItem.id}`,
              userId: firstRating.userId,
              actorId: actorItem.id,
              movieId: movie.id,
              comment: null,
              character: firstRating.roleName || null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              movie: movie,
              actor: {
                id: actorItem.id,
                name: actorItem.name,
                slug: actorItem.slug,
                imageUrl: actorItem.imageUrl,
              },
              roleName: firstRating.roleName || null,
              emotionalRangeDepth: avgRating.emotionalRangeDepth,
              characterBelievability: avgRating.characterBelievability,
              technicalSkill: avgRating.technicalSkill,
              screenPresence: avgRating.screenPresence,
              chemistryInteraction: avgRating.chemistryInteraction,
            }
            enrichedPerformances.push(newPerformance)
          }
        }
      })
    }

    // Combine the data
    const movieData = {
      ...movie,
      performances: enrichedPerformances,
      ratings: ratings || []
    }

    if (!isProd) {
      console.log("🎬 Returning movie data:", movieData.title, "with", enrichedPerformances.length, "performances")
    }
    
    const res = NextResponse.json(movieData)
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
