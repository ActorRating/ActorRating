export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { checkRatingSubmissionLimits } from "@/lib/rateLimit"
import { verifyTurnstileToken } from "@/lib/turnstile"
import {
  ANON_COOKIE_NAME,
  applyAnonCookie,
  resolveAnonSession,
} from "@/lib/anonymous-session"
import {
  isHoneypotTripped,
  upsertAnonRating,
  validateRatingTarget,
} from "@/lib/rating-submission"

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

/**
 * Anonymous rating write — identified by signed ar_anon_id cookie.
 * Requires Turnstile + honeypile; upserts one rating per performance per anonId.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    const cookieStore = await cookies()
    const session = resolveAnonSession(cookieStore.get(ANON_COOKIE_NAME)?.value)

    const limit = await checkRatingSubmissionLimits({ ip, anonId: session.anonId })
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: "Too many rating submissions. Please try again later.",
          resetTime: limit.resetTime,
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
      turnstileToken,
      website: honeypotWebsite,
      company: honeypotCompany,
    } = body

    if (isHoneypotTripped(honeypotWebsite) || isHoneypotTripped(honeypotCompany)) {
      return NextResponse.json({ error: "Invalid submission" }, { status: 400 })
    }

    const turnstile = await verifyTurnstileToken(turnstileToken, ip)
    if (!turnstile.success) {
      return NextResponse.json({ error: "Verification failed" }, { status: 403 })
    }

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

    const rating = await upsertAnonRating({
      anonId: session.anonId,
      actorId,
      movieId,
      scores,
    })

    const response = NextResponse.json({
      success: true,
      rating,
      message: "Rating saved",
    })
    if (session.isNew) {
      applyAnonCookie(response, session.cookieValue)
    }
    return response
  } catch (error) {
    console.error("Anonymous rating submission error:", error)
    const msg = error instanceof Error ? error.message : "Failed to process rating submission"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
