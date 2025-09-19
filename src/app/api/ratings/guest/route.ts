import { NextRequest, NextResponse } from "next/server"
import { verifyRecaptchaV3 } from "@/lib/recaptcha"
import { checkRateLimit } from "@/lib/rateLimit"

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'

    // Check rate limiting for ratings
    const rateLimitResult = await checkRateLimit(clientIp, 'rating')
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: "Too many rating submissions. Please try again later.",
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
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
      recaptchaToken
    } = body

    if (!actorId || !movieId) {
      return NextResponse.json(
        { error: "Actor ID and Movie ID are required" },
        { status: 400 }
      )
    }

    // Validate reCAPTCHA
    if (!recaptchaToken) {
      return NextResponse.json(
        { error: "reCAPTCHA verification is required" },
        { status: 400 }
      )
    }

    // Verify reCAPTCHA token
    const recaptchaResult = await verifyRecaptchaV3(recaptchaToken, "submit_rating", 0.5)
    if (!recaptchaResult.success) {
      return NextResponse.json(
        { error: recaptchaResult.error || "reCAPTCHA verification failed" },
        { status: 403 }
      )
    }

    // Validate rating values (0-100)
    const ratings = [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction]
    for (const rating of ratings) {
      if (rating < 0 || rating > 100) {
        return NextResponse.json(
          { error: "All ratings must be between 0 and 100" },
          { status: 400 }
        )
      }
    }

    // Store the rating data temporarily in session storage or return it to be stored client-side
    // For now, we'll return the data to be stored in localStorage and redirect to signup
    const ratingData = {
      actorId,
      movieId,
      emotionalRangeDepth,
      characterBelievability,
      technicalSkill,
      screenPresence,
      chemistryInteraction,
      comment,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      message: "Rating data prepared for signup",
      ratingData,
      redirectTo: "/auth/signup"
    })

  } catch (error) {
    console.error("Guest rating submission error:", error)
    return NextResponse.json(
      { error: "Failed to process rating submission" },
      { status: 500 }
    )
  }
}
