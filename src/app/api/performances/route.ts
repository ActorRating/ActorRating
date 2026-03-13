// app/api/performances/route.ts

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

/**
 * Helper: compute an average rating for a single rating row.
 * Adjust field names if you have different rating fields.
 */
function computeRatingAverageFromRatingRow(rating: any) {
  // If you store a single score field (e.g. "score"), prefer that:
  if (typeof (rating as any).score === "number") {
    return (rating as any).score
  }

  // Otherwise attempt to average the five actor criteria if present.
  const fields = [
    rating.emotionalRangeDepth,
    rating.characterBelievability,
    rating.technicalSkill,
    rating.screenPresence,
    rating.chemistryInteraction,
  ].filter((v) => typeof v === "number")

  if (fields.length === 0) return 0
  const sum = fields.reduce((s: number, v: number) => s + v, 0)
  // normalize to 0-100 average
  return sum / fields.length
}

/**
 * Compute an average rating for a performance aggregation.
 * ratings is an array of rating rows for that performance.
 */
function computePerformanceAverage(ratings: any[] = []) {
  if (!Array.isArray(ratings) || ratings.length === 0) return 0
  const perRating = ratings.map(computeRatingAverageFromRatingRow)
  const sum = perRating.reduce((s, v) => s + v, 0)
  return sum / perRating.length
}

export async function GET(request: NextRequest) {
  try {
    console.log('[PERFORMANCES API] Starting request')
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') // "new" or "iconic"
    console.log('[PERFORMANCES API] Section:', section)

    // Fetch performances (Performance model stores the actual performances)
    console.log('[PERFORMANCES API] Fetching performances from database...')
    const raw = await prisma.performance.findMany({
      where: { movie: { isFeaturette: false } },
      include: {
        actor: { select: { id: true, name: true, imageUrl: true } },
        movie: { select: { id: true, title: true, year: true, director: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Take only 50 to process, not 300
    })
    console.log('[PERFORMANCES API] Found', raw.length, 'performances')

    // Get actor and movie IDs to fetch slugs
    const actorIds = [...new Set(raw.map(p => p.actorId).filter(Boolean))]
    const movieIds = [...new Set(raw.map(p => p.movieId).filter(Boolean))]
    
    // Fetch slugs separately
    const [actorsWithSlugs, moviesWithSlugs] = await Promise.all([
      prisma.actor.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, slug: true } as any
      }),
      prisma.movie.findMany({
        where: { id: { in: movieIds } },
        select: { id: true, slug: true } as any
      })
    ])
    
    const actorSlugMap = new Map(actorsWithSlugs.map((a: any) => [a.id, a.slug || null]))
    const movieSlugMap = new Map(moviesWithSlugs.map((m: any) => [m.id, m.slug || null]))

    // Defensive: filter out any entries missing actor or movie and add slugs
    const valid = raw.filter((p) => p.actor && p.movie).map((p) => ({
      ...p,
      actor: {
        ...p.actor,
        slug: actorSlugMap.get(p.actorId) || null,
      },
      movie: {
        ...p.movie,
        slug: movieSlugMap.get(p.movieId) || null,
      },
    }))
    console.log('[PERFORMANCES API] Valid performances:', valid.length)

    // Fetch all ratings for these actor-movie pairs
    const actorMoviePairs = valid.map(p => ({ actorId: p.actorId, movieId: p.movieId }))
    console.log('[PERFORMANCES API] Fetching ratings for', actorMoviePairs.length, 'pairs...')
    
    const ratings = await prisma.rating.findMany({
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
    console.log('[PERFORMANCES API] Found', ratings.length, 'ratings')

    // Group ratings by actor-movie pair
    const ratingsMap = new Map<string, any[]>()
    for (const rating of ratings) {
      const key = `${rating.actorId}:${rating.movieId}`
      if (!ratingsMap.has(key)) {
        ratingsMap.set(key, [])
      }
      ratingsMap.get(key)!.push(rating)
    }

    // Build an enriched list with computed averages
    const enriched = valid.map((p) => {
      const key = `${p.actorId}:${p.movieId}`
      const perfRatings = ratingsMap.get(key) ?? []
      const avg = computePerformanceAverage(perfRatings)
      
      return {
        id: p.id,
        actorId: p.actorId,
        movieId: p.movieId,
        actor: p.actor,
        movie: p.movie,
        character: (p as any).character ?? (p as any).comment ?? null,
        createdAt: p.createdAt,
        averageRating: avg,
        ratingCount: perfRatings.length,
      }
    })
    console.log('[PERFORMANCES API] Enriched', enriched.length, 'performances')

    if (section === 'new') {
      // New: most recent unique-actor performances
      const seen = new Set<string>()
      const out: any[] = []
      for (const p of enriched) {
        const actorKey = String(p.actorId)
        if (!seen.has(actorKey)) {
          seen.add(actorKey)
          out.push(p)
        }
        if (out.length >= 6) break
      }
      console.log('[PERFORMANCES API] Returning', out.length, 'new performances')
      return NextResponse.json(out)
    }

    if (section === 'iconic') {
      // Iconic: highest averageRating first, then unique by actor
      const sorted = enriched.slice().sort((a, b) => b.averageRating - a.averageRating)
      const seen = new Set<string>()
      const out: any[] = []
      for (const p of sorted) {
        const actorKey = String(p.actorId)
        if (!seen.has(actorKey)) {
          seen.add(actorKey)
          out.push(p)
        }
        if (out.length >= 6) break
      }
      console.log('[PERFORMANCES API] Returning', out.length, 'iconic performances')
      return NextResponse.json(out)
    }

    // If no or invalid section, return both new & iconic in one payload
    const newList: any[] = []
    const seenNew = new Set<string>()
    for (const p of enriched) {
      const a = String(p.actorId)
      if (!seenNew.has(a)) {
        seenNew.add(a)
        newList.push(p)
      }
      if (newList.length >= 6) break
    }
    
    const iconicSorted = enriched.slice().sort((a, b) => b.averageRating - a.averageRating)
    const iconicList: any[] = []
    const seenIconic = new Set<string>()
    for (const p of iconicSorted) {
      const a = String(p.actorId)
      if (!seenIconic.has(a)) {
        seenIconic.add(a)
        iconicList.push(p)
      }
      if (iconicList.length >= 6) break
    }

    const resBody = { new: newList, iconic: iconicList }
    const res = NextResponse.json(resBody)
    res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120')
    console.log('[PERFORMANCES API] Returning both sections')
    return res
  } catch (error) {
    console.error("[PERFORMANCES API] ERROR:", error)
    return NextResponse.json({ error: "Failed to fetch performances" }, { status: 500 })
  }
}
