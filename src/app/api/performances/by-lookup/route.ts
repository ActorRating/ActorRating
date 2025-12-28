// app/api/performances/by-lookup/route.ts

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Cache the response for 5 minutes since the data is mostly static
export const revalidate = 300

interface LookupTarget {
  actor: string
  movie: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('[BY-LOOKUP API] Starting request')
    const body = await request.json()
    const { targets } = body
    
    if (!Array.isArray(targets) || targets.length === 0) {
      console.error('[BY-LOOKUP API] Invalid targets array')
      return NextResponse.json({ error: "Invalid targets array" }, { status: 400 })
    }
    
    console.log('[BY-LOOKUP API] Looking up performances:', targets.length, targets)
    
    // Batch fetch all actors and movies at once (much faster than sequential queries)
    const actorNames = [...new Set(targets.map(t => t.actor).filter(Boolean))]
    const movieTitles = [...new Set(targets.map(t => t.movie).filter(Boolean))]
    
    if (actorNames.length === 0 || movieTitles.length === 0) {
      console.log('[BY-LOOKUP API] No valid actor or movie names provided')
      return NextResponse.json({ performances: [] })
    }
    
    console.log('[BY-LOOKUP API] Batch fetching actors and movies...')
    const [actors, movies] = await Promise.all([
      prisma.actor.findMany({
        where: { name: { in: actorNames } },
        select: { id: true, name: true, imageUrl: true, slug: true }
      }).catch(err => {
        console.error('[BY-LOOKUP API] Error fetching actors:', err)
        return []
      }),
      prisma.movie.findMany({
        where: { title: { in: movieTitles } },
        select: { id: true, title: true, year: true, director: true, slug: true }
      }).catch(err => {
        console.error('[BY-LOOKUP API] Error fetching movies:', err)
        return []
      })
    ])
    
    // Create lookup maps for fast matching
    const actorMap = new Map(actors.map(a => [a.name, a]))
    const movieMap = new Map(movies.map(m => [m.title, m]))
    
    // Build actor-movie pairs for performance lookup
    const actorMoviePairs: Array<{ actorId: string, movieId: string, target: LookupTarget }> = []
    for (const target of targets) {
      const actor = actorMap.get(target.actor)
      const movie = movieMap.get(target.movie)
      if (actor && movie) {
        actorMoviePairs.push({ actorId: actor.id, movieId: movie.id, target })
      } else {
        if (!actor) console.log(`[BY-LOOKUP API] Actor not found: ${target.actor}`)
        if (!movie) console.log(`[BY-LOOKUP API] Movie not found: ${target.movie}`)
      }
    }
    
    if (actorMoviePairs.length === 0) {
      console.log('[BY-LOOKUP API] No valid actor-movie pairs found')
      return NextResponse.json({ performances: [] })
    }
    
    // Batch fetch all performances at once
    console.log('[BY-LOOKUP API] Batch fetching performances...')
    let performances = []
    try {
      performances = await prisma.performance.findMany({
        where: {
          OR: actorMoviePairs.map(pair => ({
            actorId: pair.actorId,
            movieId: pair.movieId
          }))
        },
        include: {
          actor: {
            select: { id: true, name: true, imageUrl: true, slug: true }
          },
          movie: {
            select: { id: true, title: true, year: true, director: true, slug: true }
          }
        }
      })
    } catch (perfError) {
      console.error('[BY-LOOKUP API] Error fetching performances:', perfError)
      return NextResponse.json({ performances: [] }, { status: 500 })
    }
    
    // Create a map for fast performance lookup
    const performanceMap = new Map(
      performances.map(p => [`${p.actorId}:${p.movieId}`, p])
    )
    
    // Match performances to targets in the correct order
    const allPerformances = []
    for (const pair of actorMoviePairs) {
      const key = `${pair.actorId}:${pair.movieId}`
      const performance = performanceMap.get(key)
      if (performance) {
        allPerformances.push(performance)
        console.log(`[BY-LOOKUP API] Found: ${pair.target.actor} - ${pair.target.movie}`)
      } else {
        console.log(`[BY-LOOKUP API] Performance not found: ${pair.target.actor} - ${pair.target.movie}`)
      }
    }
    
    console.log('[BY-LOOKUP API] Total found performances:', allPerformances.length)
    
    // Filter out invalid ones
    const valid = allPerformances.filter(p => p.actor && p.movie)
    
    if (valid.length === 0) {
      console.log('[BY-LOOKUP API] No valid performances found')
      return NextResponse.json({ performances: [] })
    }
    
    // Fetch ratings for these performances
    const ratingPairs = valid.map(p => ({ actorId: p.actorId, movieId: p.movieId }))
    
    console.log('[BY-LOOKUP API] Fetching ratings for', ratingPairs.length, 'performances')
    
    let ratings = []
    try {
      if (ratingPairs.length > 0) {
        ratings = await prisma.rating.findMany({
          where: {
            OR: ratingPairs
          },
          select: {
            actorId: true,
            movieId: true,
            emotionalRangeDepth: true,
            characterBelievability: true,
            technicalSkill: true,
            screenPresence: true,
            chemistryInteraction: true,
          },
        })
        console.log('[BY-LOOKUP API] Found', ratings.length, 'ratings')
      }
    } catch (ratingError) {
      console.error('[BY-LOOKUP API] Error fetching ratings:', ratingError)
      // Continue without ratings
    }
    
    // Group ratings by actor-movie pair
    const ratingsMap = new Map<string, any[]>()
    for (const rating of ratings) {
      const key = `${rating.actorId}:${rating.movieId}`
      if (!ratingsMap.has(key)) {
        ratingsMap.set(key, [])
      }
      ratingsMap.get(key)!.push(rating)
    }
    
    // Compute averages
    const computeAverage = (ratings: any[] = []) => {
      if (!Array.isArray(ratings) || ratings.length === 0) return 0
      const perRating = ratings.map((r: any) => {
        const fields = [
          r.emotionalRangeDepth,
          r.characterBelievability,
          r.technicalSkill,
          r.screenPresence,
          r.chemistryInteraction,
        ].filter((v) => typeof v === "number")
        if (fields.length === 0) return 0
        return fields.reduce((s: number, v: number) => s + v, 0) / fields.length
      })
      return perRating.reduce((s, v) => s + v, 0) / perRating.length
    }
    
    // Build enriched list
    const enriched = valid.map((p) => {
      const key = `${p.actorId}:${p.movieId}`
      const perfRatings = ratingsMap.get(key) ?? []
      const ratingCount = perfRatings.length
      // Only compute average if there are ratings, otherwise return null
      const avg = ratingCount > 0 ? computeAverage(perfRatings) : null
      
      return {
        id: p.id,
        actorId: p.actorId,
        movieId: p.movieId,
        character: p.character,
        actor: p.actor,
        movie: p.movie,
        averageRating: avg,
        ratingCount: ratingCount,
      }
    })
    
    console.log('[BY-LOOKUP API] Enriched performances:', enriched.length)
    console.log('[BY-LOOKUP API] Found:', enriched.map(p => `${p.actor.name} - ${p.movie.title}`))
    
    const response = NextResponse.json({ performances: enriched })
    
    // Cache for 5 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    
    return response
  } catch (error) {
    console.error("[BY-LOOKUP API] ERROR:", error)
    return NextResponse.json({ error: "Failed to fetch performances" }, { status: 500 })
  }
}

