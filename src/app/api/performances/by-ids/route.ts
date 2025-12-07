// app/api/performances/by-ids/route.ts

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid IDs array" }, { status: 400 })
    }
    
    console.log('[BY-IDS API] Fetching performances:', ids.length)
    
    // Fetch performances by IDs
    const performances = await prisma.performance.findMany({
      where: {
        id: {
          in: ids
        }
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
    
    console.log('[BY-IDS API] Found performances:', performances.length)
    
    // Filter out invalid ones
    const valid = performances.filter(p => p.actor && p.movie)
    
    // Fetch ratings for these performances
    const actorMoviePairs = valid.map(p => ({ actorId: p.actorId, movieId: p.movieId }))
    
    const ratings = await prisma.rating.findMany({
      where: {
        OR: actorMoviePairs.length > 0 ? actorMoviePairs : [{ actorId: '', movieId: '' }]
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
    
    console.log('[BY-IDS API] Enriched performances:', enriched.length)
    
    return NextResponse.json({ performances: enriched })
  } catch (error) {
    console.error("[BY-IDS API] ERROR:", error)
    return NextResponse.json({ error: "Failed to fetch performances" }, { status: 500 })
  }
}



