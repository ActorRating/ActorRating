export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserId } from "@/lib/authUser"
import { resolveActorId, resolveMovieId } from "@/lib/resolve-entity-id"
import {
  getRateAnotherPerformances,
  getSameActorRateProgress,
  rateAnotherPairKey,
  RATE_ANOTHER_LIMIT,
} from "@/lib/success-rate-another"

/**
 * GET /api/actors/[id]/next-unrated-performance
 * "Rate another" carousel after a successful rating.
 * Priority: other LEADs in the same movie → SUPPORTING in the same movie →
 * other films by this actor.
 * Query: currentMovieId (required for best results) — the just-rated movie (id or slug).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: actorIdOrSlug } = await params
    const { searchParams } = new URL(request.url)
    const currentMovieId = searchParams.get("currentMovieId") ?? undefined

    const actorId = await resolveActorId(actorIdOrSlug)
    if (!actorId) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 })
    }

    const movieId = currentMovieId ? await resolveMovieId(currentMovieId) : null
    if (!movieId) {
      // Still return same-actor progress when movie param is missing/invalid.
      const ratedRows = await prisma.rating.findMany({
        where: { userId, actorId },
        select: { movieId: true },
      })
      const progress = await getSameActorRateProgress(prisma, {
        actorId,
        ratedMovieIds: new Set(ratedRows.map((r) => r.movieId)),
      })
      return NextResponse.json({
        performances: [],
        totalPerformances: progress.totalPerformances,
        userRatedCount: progress.userRatedCount,
      })
    }

    const ratedRows = await prisma.rating.findMany({
      where: { userId },
      select: { actorId: true, movieId: true },
    })
    const excludePairs = new Set(
      ratedRows.map((r) => rateAnotherPairKey(r.actorId, r.movieId))
    )
    excludePairs.add(rateAnotherPairKey(actorId, movieId))

    const performances = await getRateAnotherPerformances(prisma, {
      actorId,
      movieId,
      excludePairs,
      limit: RATE_ANOTHER_LIMIT,
    })

    const ratedMovieIdsForActor = new Set(
      ratedRows.filter((r) => r.actorId === actorId).map((r) => r.movieId)
    )
    ratedMovieIdsForActor.add(movieId)

    const progress = await getSameActorRateProgress(prisma, {
      actorId,
      ratedMovieIds: ratedMovieIdsForActor,
    })

    return NextResponse.json({
      performances: performances.map((p) => ({
        movieSlug: p.movieSlug,
        actorSlug: p.actorSlug,
        movieTitle: p.movieTitle,
        movieYear: p.movieYear,
        moviePosterUrl: p.moviePosterUrl,
        actorImageUrl: p.actorImageUrl,
        actorName: p.actorName,
      })),
      totalPerformances: progress.totalPerformances,
      userRatedCount: progress.userRatedCount,
    })
  } catch (err) {
    console.error("next-unrated-performance error", err)
    return NextResponse.json(
      { error: "Failed to get next unrated performance" },
      { status: 500 }
    )
  }
}
