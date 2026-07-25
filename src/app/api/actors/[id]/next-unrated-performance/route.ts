export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserId } from "@/lib/authUser"
import {
  getRateAnotherPerformances,
  getSameActorRateProgress,
  rateAnotherPairKey,
  RATE_ANOTHER_LIMIT,
} from "@/lib/success-rate-another"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/actors/[id]/next-unrated-performance
 * "Rate another" carousel after a successful rating.
 * Priority: other LEADs in the same movie → SUPPORTING in the same movie →
 * other films by this actor.
 * Query: currentMovieId (required for best results) — the just-rated movie.
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

    let actorId = actorIdOrSlug
    if (!UUID_REGEX.test(actorIdOrSlug)) {
      const actor = await prisma.actor.findUnique({
        where: { slug: actorIdOrSlug },
        select: { id: true },
      })
      if (!actor) {
        return NextResponse.json({ error: "Actor not found" }, { status: 404 })
      }
      actorId = actor.id
    }

    let movieId = currentMovieId
    if (movieId && !UUID_REGEX.test(movieId)) {
      const movie = await prisma.movie.findUnique({
        where: { slug: movieId },
        select: { id: true },
      })
      movieId = movie?.id
    }

    if (!movieId) {
      return NextResponse.json({
        performances: [],
        totalPerformances: 0,
        userRatedCount: 0,
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
