export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { pickBetterCharacter, hasUsableCharacter } from "@/lib/hydrate-performance-billing"
import { isNonRateablePerformance, matchesFeaturetteTitle } from "@/lib/non-rateable"

const actorApiMovieSelect = {
  id: true,
  title: true,
  year: true,
  director: true,
  tmdbId: true,
  slug: true,
  posterUrl: true,
  isFeaturette: true,
} as Prisma.MovieSelect

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
      console.log("🎭 Fetching actor with ID or slug:", id, minimal ? "(minimal)" : "")
    }

    // Try to fetch by slug first, then fallback to ID
    let actor = await prisma.actor.findFirst({ where: { slug: id } })
    if (!actor) {
      actor = await prisma.actor.findUnique({ where: { id } })
    }
    if (!actor) {
      console.error("❌ Actor fetch error: actor not found", id)
      return NextResponse.json({ error: "Actor not found" }, { status: 410 })
    }

    if (!isProd) {
      console.log("🎭 Actor found:", actor.name)
    }

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

    const [performances, ratings] = await Promise.all([
      prisma.performance.findMany({
        where: {
          actorId: actor.id,
          movie: { is: { isFeaturette: false } },
        },
        select: {
          id: true,
          userId: true,
          actorId: true,
          movieId: true,
          comment: true,
          character: true,
          seededAggregateScore: true,
          createdAt: true,
          updatedAt: true,
          movie: { select: actorApiMovieSelect },
          actor: { select: { id: true, name: true, slug: true, imageUrl: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 300,
      }),
      prisma.rating.findMany({
        where: { actorId: actor.id },
        select: {
          userId: true,
          movieId: true,
          roleName: true,
          weightedScore: true,
          emotionalRangeDepth: true,
          characterBelievability: true,
          technicalSkill: true,
          screenPresence: true,
          chemistryInteraction: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
    ])

    // Aggregate ratings by movie; compute averaged criteria so community score is accurate
    const ratingsByMovie = new Map<string, any[]>()

    if (ratings) {
      ratings.forEach(rating => {
        const key = `${rating.movieId}`
        if (!ratingsByMovie.has(key)) {
          ratingsByMovie.set(key, [])
        }
        ratingsByMovie.get(key)!.push(rating)
      })
    }

    // Build a ratingMap with averaged criteria values per movie (fixes score discrepancy
    // between actor page and rate page which both use the same weighted average formula)
    const ratingMap = new Map<string, any>()
    ratingsByMovie.forEach((movieRatings, movieId) => {
      const count = movieRatings.length
      const first = movieRatings[0]
      const avg = (field: string) =>
        Math.round(movieRatings.reduce((s, r) => s + (r[field] || 0), 0) / count)
      ratingMap.set(movieId, {
        roleName: first.roleName,
        emotionalRangeDepth: avg('emotionalRangeDepth'),
        characterBelievability: avg('characterBelievability'),
        technicalSkill: avg('technicalSkill'),
        screenPresence: avg('screenPresence'),
        chemistryInteraction: avg('chemistryInteraction'),
        ratingCount: count,
      })
    })

    // Get all unique movies that have ratings
    const ratedMovieIds = new Set(ratings.map(r => r.movieId))

    // Fetch movie details for rated movies that might not have performances
    const ratedMovies = ratedMovieIds.size > 0
      ? await prisma.movie.findMany({
          where: {
            id: { in: Array.from(ratedMovieIds) },
            isFeaturette: false,
          },
          select: actorApiMovieSelect,
        })
      : []

    // Per-movie set of userIds who have rated (so we prefer a performance that has ratings)
    const userIdsWhoRatedByMovie = new Map<string, Set<string>>()
    ratingsByMovie.forEach((movieRatings, movieId) => {
      userIdsWhoRatedByMovie.set(movieId, new Set(movieRatings.map((r: any) => r.userId)))
    })

    // One row per movie: Performance has @@unique([userId, actorId, movieId]). Dedupe by movieId.
    // Prefer the performance that has ratings (userId in ratings for this movie), then system, then latest.
    // Always keep the best available character (system rows usually carry the TMDB name).
    const performanceMap = new Map<string, any>()
    const SYSTEM_USER_ID = "uuid-from-auth-users"
    const mergePerf = (preferred: any, other: any) => ({
      ...preferred,
      character: pickBetterCharacter(preferred.character, other.character),
      comment: hasUsableCharacter(preferred.character)
        ? preferred.comment
        : (other.comment ?? preferred.comment),
      order: preferred.order ?? other.order,
      tier: preferred.tier ?? other.tier,
    })
    performances.forEach(perf => {
        const existing = performanceMap.get(perf.movieId)
        const ratedUserIds = userIdsWhoRatedByMovie.get(perf.movieId)
        const perfHasRating = !!(perf.userId && ratedUserIds?.has(perf.userId))
        const existingHasRating = !!(existing?.userId && ratedUserIds?.has(existing.userId))
        const perfIsSystem = perf.userId === SYSTEM_USER_ID
        const existingIsSystem = existing?.userId === SYSTEM_USER_ID
        if (!existing) {
          performanceMap.set(perf.movieId, perf)
        } else if (perfHasRating && !existingHasRating) {
          performanceMap.set(perf.movieId, mergePerf(perf, existing))
        } else if (!perfHasRating && existingHasRating) {
          performanceMap.set(perf.movieId, mergePerf(existing, perf))
        } else if (perfIsSystem && !existingIsSystem) {
          performanceMap.set(perf.movieId, mergePerf(perf, existing))
        } else if (!perfIsSystem && existingIsSystem) {
          performanceMap.set(perf.movieId, mergePerf(existing, perf))
        } else if (perf.updatedAt > (existing.updatedAt || '')) {
          performanceMap.set(perf.movieId, mergePerf(perf, existing))
        } else {
          performanceMap.set(perf.movieId, mergePerf(existing, perf))
        }
      })

    const uniquePerformances = Array.from(performanceMap.values())

    // Combine existing performances with their rating data
    const enrichedPerformances = uniquePerformances.map(performance => {
      const key = performance.movieId
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
        user: {
          name: `User ${performance.userId?.slice(-4) || 'Unknown'}`,
          email: `user@example.com`
        }
      }
    })

    // Add performances for movies that have ratings but no performance entry
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

          // Synthetic performance entry: match shape expected by frontend (movie/actor as single objects)
          const syntheticPerf = {
            id: `rating-${movie.id}`,
            userId: firstRating.userId,
            actorId: actor.id,
            movieId: movie.id,
            comment: null,
            character: firstRating.roleName || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            movie,
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
          }
          enrichedPerformances.push(syntheticPerf as unknown as (typeof enrichedPerformances)[number])
        }
      }
    })

    // Soft-gate: hide Self / archive credits and unmarked featurette titles (stay in DB).
    const rateablePerformances = enrichedPerformances.filter(
      (p) =>
        !isNonRateablePerformance({
          character: p.character ?? p.roleName,
          movie: p.movie,
        })
    )

    // Lazily persist title-matched featurettes so later queries skip them via isFeaturette.
    const featuretteIdsToFlag = [
      ...new Set(
        enrichedPerformances
          .filter(
            (p) =>
              p.movie &&
              !p.movie.isFeaturette &&
              matchesFeaturetteTitle(p.movie.title)
          )
          .map((p) => p.movieId)
          .filter(Boolean)
      ),
    ]
    if (featuretteIdsToFlag.length > 0) {
      void prisma.movie
        .updateMany({
          where: { id: { in: featuretteIdsToFlag } },
          data: { isFeaturette: true },
        })
        .catch(() => {})
    }

    // Combine the data
    const actorData = {
      ...actor,
      performances: rateablePerformances,
      ratings
    }

    if (!isProd) {
      console.log("🎭 Returning actor data:", actorData.name, "with", rateablePerformances.length, "performances (deduped by movie)")
    }

    const res = NextResponse.json(actorData)
    // Prevent browsers from holding a stale actor JSON (missing new fields like posterUrl) across reloads.
    if (!isProd) {
      res.headers.set('Cache-Control', 'no-store, must-revalidate')
    } else {
      res.headers.set(
        'Cache-Control',
        'public, s-maxage=600, stale-while-revalidate=86400'
      )
    }
    return res
  } catch (error) {
    console.error("❌ Error fetching actor:", error)
    return NextResponse.json(
      { error: "Failed to fetch actor" },
      { status: 500 }
    )
  }
}