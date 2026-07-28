export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  getRateAnotherPerformances,
  rateAnotherPairKey,
  RATE_ANOTHER_LIMIT,
} from "@/lib/success-rate-another"
import { resolveActorId, resolveMovieId } from "@/lib/resolve-entity-id"

/**
 * GET /api/performances/rate-another
 * Public success-carousel recommendations (guests).
 * Query:
 *   actorId (id or slug)
 *   movieId (id or slug)
 *   exclude — optional JSON array of { actorId, movieId }
 *
 * Priority: same-movie LEAD → same-movie SUPPORTING → same actor other films.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const actorParam = searchParams.get("actorId")
    const movieParam = searchParams.get("movieId")
    if (!actorParam || !movieParam) {
      return NextResponse.json(
        { error: "actorId and movieId are required" },
        { status: 400 }
      )
    }

    const actorId = await resolveActorId(actorParam)
    const movieId = await resolveMovieId(movieParam)
    if (!actorId || !movieId) {
      return NextResponse.json({ performances: [] })
    }

    const excludePairs = new Set<string>([rateAnotherPairKey(actorId, movieId)])
    const excludeRaw = searchParams.get("exclude")
    if (excludeRaw) {
      try {
        const parsed = JSON.parse(excludeRaw) as Array<{
          actorId?: string
          movieId?: string
        }>
        if (Array.isArray(parsed)) {
          for (const row of parsed) {
            if (row?.actorId && row?.movieId) {
              excludePairs.add(rateAnotherPairKey(row.actorId, row.movieId))
            }
          }
        }
      } catch {
        /* ignore bad exclude payload */
      }
    }

    const performances = await getRateAnotherPerformances(prisma, {
      actorId,
      movieId,
      excludePairs,
      limit: RATE_ANOTHER_LIMIT,
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
    })
  } catch (err) {
    console.error("rate-another error", err)
    return NextResponse.json({ performances: [] })
  }
}
