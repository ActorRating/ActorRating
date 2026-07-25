export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rateLimit"
import { isFeaturetteMovie, isSelfOrArchiveCredit, matchesFeaturetteTitle } from "@/lib/non-rateable"
import { isMovieComingSoon } from "@/lib/movie-release"

/**
 * Persist a guest (unsigned) rating to the DB with userId = null.
 * Still mirrored in localStorage on the client for limit/UX; admin Guest tab reads DB.
 * Guest rows are excluded from public community-stats averages.
 */
export async function POST(request: NextRequest) {
  try {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"

    const rateLimitResult = await checkRateLimit(clientIp, "rating")
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many rating submissions. Please try again later.",
          resetTime: rateLimitResult.resetTime,
        },
        { status: 429 },
      )
    }

    const body = await request.json()
    const {
      actorId,
      movieId,
      emotionalRangeDepth,
      characterBelievability,
      technicalSkill,
      screenPresence,
      chemistryInteraction,
      comment,
    } = body

    if (!actorId || !movieId) {
      return NextResponse.json(
        { error: "Actor ID and Movie ID are required" },
        { status: 400 },
      )
    }

    if (typeof actorId !== "string" || typeof movieId !== "string") {
      return NextResponse.json(
        { error: "Actor ID and Movie ID must be strings" },
        { status: 400 },
      )
    }

    const ratings = [
      emotionalRangeDepth,
      characterBelievability,
      technicalSkill,
      screenPresence,
      chemistryInteraction,
    ]
    for (const rating of ratings) {
      if (typeof rating !== "number" || rating < 0 || rating > 100) {
        return NextResponse.json(
          { error: "All ratings must be numbers between 0 and 100" },
          { status: 400 },
        )
      }
    }

    const [actor, movie] = await Promise.all([
      prisma.actor.findUnique({ where: { id: actorId } }),
      prisma.movie.findUnique({ where: { id: movieId } }),
    ])

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 })
    }
    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 400 })
    }

    if (isFeaturetteMovie(movie)) {
      if (!movie.isFeaturette && matchesFeaturetteTitle(movie.title)) {
        void prisma.movie
          .update({ where: { id: movie.id }, data: { isFeaturette: true } })
          .catch(() => {})
      }
      return NextResponse.json(
        { error: "This title is not available for rating" },
        { status: 400 },
      )
    }

    if (isMovieComingSoon(movie)) {
      return NextResponse.json(
        { error: "This movie is not out yet — rating opens on release day" },
        { status: 400 },
      )
    }

    const existingPerf = await prisma.performance.findFirst({
      where: { actorId, movieId },
      select: { character: true },
      orderBy: { createdAt: "asc" },
    })
    if (isSelfOrArchiveCredit(existingPerf?.character)) {
      return NextResponse.json(
        { error: "This credit is not available for rating" },
        { status: 400 },
      )
    }

    const weightedScore =
      emotionalRangeDepth * 0.25 +
      characterBelievability * 0.25 +
      technicalSkill * 0.2 +
      screenPresence * 0.15 +
      chemistryInteraction * 0.15
    const shareScore = Math.round(weightedScore)

    const rating = await prisma.rating.create({
      data: {
        id: `rating_${nanoid()}`,
        userId: null,
        actorId,
        movieId,
        emotionalRangeDepth,
        characterBelievability,
        technicalSkill,
        screenPresence,
        chemistryInteraction,
        weightedScore,
        shareScore,
        comment: typeof comment === "string" ? comment : null,
      },
      select: {
        id: true,
        weightedScore: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      rating,
      message: "Guest rating saved",
    })
  } catch (error) {
    console.error("Guest rating submission error:", error)
    return NextResponse.json(
      { error: "Failed to process rating submission" },
      { status: 500 },
    )
  }
}
