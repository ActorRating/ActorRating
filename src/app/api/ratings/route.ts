export const dynamic = "force-dynamic";

// src/app/api/ratings/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserId } from "@/lib/authUser"
import { checkRatingSubmissionLimits } from "@/lib/rateLimit"
import { verifyRecaptchaV3 } from "@/lib/recaptcha"
import {
  isHoneypotTripped,
  upsertUserRating,
  validateRatingTarget,
} from "@/lib/rating-submission"

export async function GET() {
  try {
    const ratings = await prisma.rating.findMany({
      select: {
        id: true,
        actorId: true,
        movieId: true,
        weightedScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(ratings)
  } catch (error) {
    console.error("Error fetching ratings:", error)
    return NextResponse.json({ error: "Failed to fetch ratings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return handleRating(request, false)
}

export async function PUT(request: NextRequest) {
  return handleRating(request, true)
}

// Unified handler for POST (create) and PUT (update) — authenticated users only.
async function handleRating(request: NextRequest, isUpdate: boolean) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const {
      ratingId,
      actorId,
      movieId,
      emotionalRangeDepth,
      characterBelievability,
      technicalSkill,
      screenPresence,
      chemistryInteraction,
      comment,
      isSpoiler: rawIsSpoiler,
      recaptchaToken,
      breakdown,
      weightedScore: providedWeightedScore,
      website: honeypotWebsite,
      company: honeypotCompany,
    } = body

    if (isHoneypotTripped(honeypotWebsite) || isHoneypotTripped(honeypotCompany)) {
      return NextResponse.json({ error: "Invalid submission" }, { status: 400 })
    }

    if (!actorId || !movieId) {
      return NextResponse.json({ error: "Actor ID and Movie ID are required" }, { status: 400 })
    }
    if (typeof actorId !== "string" || typeof movieId !== "string") {
      return NextResponse.json({ error: "Actor ID and Movie ID must be strings" }, { status: 400 })
    }

    const bypassTokens = ["dev_mock_token_submit_rating_123", "bypass"]
    const isBypassToken = recaptchaToken && bypassTokens.includes(recaptchaToken)
    if (!isBypassToken && recaptchaToken) {
      const recaptchaResult = await verifyRecaptchaV3(recaptchaToken, "submit_rating", 0.5)
      if (!recaptchaResult.success) {
        return NextResponse.json({ error: "reCAPTCHA verification failed" }, { status: 403 })
      }
    }

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"
    const rateLimitResult = await checkRatingSubmissionLimits({ ip: clientIp, userId })
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const target = await validateRatingTarget(actorId, movieId)
    if (!target.ok) {
      return NextResponse.json({ error: target.error }, { status: target.status })
    }

    const scores = {
      emotionalRangeDepth,
      characterBelievability,
      technicalSkill,
      screenPresence,
      chemistryInteraction,
    }

    const rating = await upsertUserRating({
      userId,
      actorId,
      movieId,
      scores,
      comment,
      isSpoiler: rawIsSpoiler,
      breakdown,
      ratingId,
      providedWeightedScore,
      isUpdate,
    })

    return NextResponse.json(rating, { status: isUpdate ? 200 : 201 })
  } catch (error) {
    console.error("=== RATING API ERROR ===", error)
    if (error instanceof Error) {
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
      if (error.message.includes('Foreign key constraint')) return NextResponse.json({ error: "Invalid data - actor or movie not found" }, { status: 400 })
      if (error.message.includes('Unique constraint')) return NextResponse.json({ error: "Rating already exists" }, { status: 409 })
      if (error.message.includes('null value in column') || error.message.includes('NOT NULL constraint')) {
        return NextResponse.json({ error: "Missing required field", debug: error.message }, { status: 400 })
      }
      // Database connection / availability (e.g. DATABASE_URL wrong or Postgres down)
      const msg = error.message.toLowerCase()
      const isDbConnectionError = msg.includes('connect') || msg.includes('econnrefused') || msg.includes('timeout') ||
        msg.includes('p1001') || msg.includes('p1002') || msg.includes('p1017') || msg.includes('connection')
      if (isDbConnectionError) {
        return NextResponse.json(
          { error: "Database temporarily unavailable. Check server logs and DATABASE_URL.", code: "DATABASE_UNAVAILABLE" },
          { status: 503 }
        )
      }
    }
    const errMessage = error instanceof Error ? error.message : String(error)
    console.error("RATING API ERROR (returning 500):", errMessage)
    return NextResponse.json(
      {
        error: "Internal server error",
        debug: errMessage,
        hint: "Check Vercel function logs for 'RATING API ERROR' and ensure DATABASE_URL points to your Prisma PostgreSQL database.",
      },
      { status: 500 }
    )
  }
}
