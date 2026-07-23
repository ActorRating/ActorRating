export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isAdultContentMovie, isAdultContentSlug } from "@/lib/adult-content-filter"
import { isJunkMovieSlug, isAllowedMovieSlug } from "@/lib/junk-movie-slugs"
import { hydratePerformanceBillingOrder, pickBetterCharacter, hasUsableCharacter } from "@/lib/hydrate-performance-billing"
import { isFeaturetteMovie, isSelfOrArchiveCredit, matchesFeaturetteTitle } from "@/lib/non-rateable"
import { getMovieDetails } from "@/lib/tmdb"
import { parseTmdbReleaseDate } from "@/lib/movie-release"

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
    let movie = await prisma.movie.findFirst({ where: { slug: id } })
    if (!movie) {
      movie = await prisma.movie.findUnique({ where: { id } })
    }
    if (!movie) {
      console.error("❌ Movie fetch error: movie not found", id)
      return NextResponse.json({ error: "Movie not found" }, { status: 410 })
    }

    // Featurettes stay in DB but have no public movie page / cast UI.
    if (isFeaturetteMovie(movie)) {
      if (!movie.isFeaturette && matchesFeaturetteTitle(movie.title)) {
        void prisma.movie
          .update({ where: { id: movie.id }, data: { isFeaturette: true } })
          .catch(() => {})
      }
      return NextResponse.json({ error: "Movie not found" }, { status: 410 })
    }

    // Lazy-fill releaseDate from TMDB so coming-soon gating works without a full backfill.
    if (!movie.releaseDate && movie.tmdbId != null) {
      try {
        const details = await getMovieDetails(movie.tmdbId)
        const releaseDate = parseTmdbReleaseDate(details?.releaseDate ?? null)
        if (releaseDate) {
          movie = await prisma.movie.update({
            where: { id: movie.id },
            data: { releaseDate },
          })
        }
      } catch {
        /* non-blocking */
      }
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

    const TIER_RANK: Record<string, number> = { LEAD: 0, SUPPORTING: 1, MINOR: 2 }

    // Fetch performances and ratings in parallel for better performance
    const [performances, ratings] = await Promise.all([
      prisma.performance.findMany({
        where: { movieId: movie.id },
        select: {
          id: true,
          userId: true,
          actorId: true,
          movieId: true,
          comment: true,
          character: true,
          order: true,
          tier: true,
          seededAggregateScore: true,
          createdAt: true,
          updatedAt: true,
          movie: { select: { id: true, title: true, year: true, director: true, tmdbId: true, slug: true } },
          actor: { select: { id: true, name: true, slug: true, imageUrl: true, tmdbId: true } },
        },
        // Prefer billing order so early rows are leads when we hit the take limit.
        orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
        take: 200,
      }),
      prisma.rating.findMany({
        where: { movieId: movie.id },
        select: {
          userId: true,
          actorId: true,
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
      })
    ])

    // Aggregate ratings per actor; compute averaged criteria so community score is accurate.
    const ratingsByActor = new Map<string, any[]>()
    ratings.forEach(rating => {
      if (!ratingsByActor.has(rating.actorId)) ratingsByActor.set(rating.actorId, [])
      ratingsByActor.get(rating.actorId)!.push(rating)
    })

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
    const ratedActorIds = new Set(ratings.map(r => r.actorId))
    const performanceActorIds = new Set(performances.map(p => p.actorId))
    const actorsNeedingFetch = Array.from(ratedActorIds).filter(id => !performanceActorIds.has(id))
    
    // Only fetch actor details if there are actors with ratings but no performances
    let ratedActors: any[] = []
    if (actorsNeedingFetch.length > 0) {
      ratedActors = await prisma.actor.findMany({
        where: { id: { in: actorsNeedingFetch } },
        select: { id: true, name: true, slug: true, imageUrl: true },
      })
    }
    
    // One performance per actor: DB can return multiple rows per actor (system + per-user).
    // Prefer: has community rating → better tier → lower billing order → latest update.
    // Always keep the best available character name from either row (system often has TMDB name).
    const byActor = new Map<string, any>()
    const prefersOver = (candidate: any, existing: any) => {
      const candHasRating = ratingMap.has(`${candidate.actorId}:${candidate.movieId}`)
      const existingHasRating = ratingMap.has(`${existing.actorId}:${existing.movieId}`)
      if (candHasRating !== existingHasRating) return candHasRating
      const candTier = TIER_RANK[candidate.tier] ?? 2
      const existingTier = TIER_RANK[existing.tier] ?? 2
      if (candTier !== existingTier) return candTier < existingTier
      const candOrder = candidate.order ?? Number.POSITIVE_INFINITY
      const existingOrder = existing.order ?? Number.POSITIVE_INFINITY
      if (candOrder !== existingOrder) return candOrder < existingOrder
      return new Date(candidate.updatedAt).getTime() > new Date(existing.updatedAt).getTime()
    }
    performances.forEach(perf => {
      const aid = perf.actorId
      const existing = byActor.get(aid)
      if (!existing) {
        byActor.set(aid, perf)
        return
      }
      if (prefersOver(perf, existing)) {
        byActor.set(aid, {
          ...perf,
          character: pickBetterCharacter(perf.character, existing.character),
          comment: hasUsableCharacter(perf.character)
            ? perf.comment
            : (existing.comment ?? perf.comment),
          order: perf.order ?? existing.order,
          tier: perf.tier ?? existing.tier,
        })
      } else {
        byActor.set(aid, {
          ...existing,
          character: pickBetterCharacter(existing.character, perf.character),
          comment: hasUsableCharacter(existing.character)
            ? existing.comment
            : (perf.comment ?? existing.comment),
          order: existing.order ?? perf.order,
          tier: existing.tier ?? perf.tier,
        })
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
              order: null,
              tier: "MINOR",
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

    const billedPerformances = await hydratePerformanceBillingOrder(
      prisma,
      { id: movie.id, tmdbId: movie.tmdbId },
      enrichedPerformances,
      { persist: true }
    )

    billedPerformances.sort((a: any, b: any) => {
      const tierA = TIER_RANK[a.tier] ?? 2
      const tierB = TIER_RANK[b.tier] ?? 2
      if (tierA !== tierB) return tierA - tierB
      const orderA = a.order ?? Number.POSITIVE_INFINITY
      const orderB = b.order ?? Number.POSITIVE_INFINITY
      if (orderA !== orderB) return orderA - orderB
      return String(a.actor?.name || "").localeCompare(String(b.actor?.name || ""))
    })

    const rateableCast = billedPerformances.filter(
      (p: any) => !isSelfOrArchiveCredit(p.character ?? p.roleName)
    )

    // Combine the data
    const movieData = {
      ...movie,
      performances: rateableCast,
      ratings
    }

    if (!isProd) {
      console.log("🎬 Returning movie data:", movieData.title, "with", rateableCast.length, "performances")
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
