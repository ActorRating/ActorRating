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
    
    // Look up each performance individually to avoid complex OR query issues
    const allPerformances = []
    
    for (const target of targets) {
      try {
        // First find actor
        const actor = await prisma.actor.findFirst({
          where: { name: target.actor }
        })
        
        if (!actor) {
          console.log(`[BY-LOOKUP API] Actor not found: ${target.actor}`)
          continue
        }
        
        // Then find movie
        const movie = await prisma.movie.findFirst({
          where: { title: target.movie }
        })
        
        if (!movie) {
          console.log(`[BY-LOOKUP API] Movie not found: ${target.movie}`)
          continue
        }
        
        // Now find the performance
        const performance = await prisma.performance.findFirst({
          where: {
            actorId: actor.id,
            movieId: movie.id
          },
          include: {
            actor: {
              select: { id: true, name: true, imageUrl: true }
            },
            movie: {
              select: { id: true, title: true, year: true, director: true }
            }
          }
        })
        
        if (performance) {
          allPerformances.push(performance)
          console.log(`[BY-LOOKUP API] Found: ${actor.name} - ${movie.title}`)
        } else {
          console.log(`[BY-LOOKUP API] Performance not found: ${target.actor} - ${target.movie}`)
        }
      } catch (innerError) {
        console.error(`[BY-LOOKUP API] Error looking up ${target.actor} - ${target.movie}:`, innerError)
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
    const actorMoviePairs = valid.map(p => ({ actorId: p.actorId, movieId: p.movieId }))
    
    console.log('[BY-LOOKUP API] Fetching ratings for', actorMoviePairs.length, 'performances')
    
    let ratings = []
    try {
      if (actorMoviePairs.length > 0) {
        ratings = await prisma.rating.findMany({
          where: {
            OR: actorMoviePairs
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
      const avg = computeAverage(perfRatings)
      
      return {
        id: p.id,
        actorId: p.actorId,
        movieId: p.movieId,
        character: p.character,
        actor: p.actor,
        movie: p.movie,
        averageRating: avg,
        ratingCount: perfRatings.length,
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

