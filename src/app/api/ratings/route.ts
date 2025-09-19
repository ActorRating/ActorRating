import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rateLimit"
// email verification logic removed
import { verifyRecaptchaV3 } from "@/lib/recaptcha"
import { revalidatePath } from "next/cache"

export async function GET() {
  try {
    const cacheKey = makeCacheKey('ratings:list', ['recent'])
    const cached = await cacheGet<any[]>(cacheKey)
    if (cached) {
      const cachedRes = NextResponse.json(cached)
      cachedRes.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
      return cachedRes
    }
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
    await cacheSet(cacheKey, ratings, 60)
    const res = NextResponse.json(ratings)
    res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
    return res
  } catch (error) {
    console.error("Error fetching ratings:", error)
    return NextResponse.json(
      { error: "Failed to fetch ratings" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

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

    // Validate reCAPTCHA (skip for post-signup/signin submissions)
    if (recaptchaToken !== 'bypass') {
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

    // Get user info for verified rater status
    const user = null

    // Calculate weighted score (verified raters get slightly more weight)
    const baseWeightedScore = 
      emotionalRangeDepth * 0.25 +
      characterBelievability * 0.25 +
      technicalSkill * 0.20 +
      screenPresence * 0.15 +
      chemistryInteraction * 0.15

    // Apply verified rater bonus (5% increase for verified raters)
    const weightedScore = baseWeightedScore

    // Check if user has already rated this performance
    const existingRating = await prisma.rating.findUnique({
      where: {
        userId_actorId_movieId: {
          userId: session.user.id,
          actorId,
          movieId,
        },
      },
    })

    if (existingRating) {
      // Update existing rating
      const shareScore = Math.round(baseWeightedScore)
      const rating = await prisma.rating.update({
        where: {
          id: existingRating.id,
        },
        data: {
          emotionalRangeDepth,
          characterBelievability,
          technicalSkill,
          screenPresence,
          chemistryInteraction,
          weightedScore,
          shareScore,
          comment,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              isVerifiedRater: true,
            },
          },
          actor: {
            select: {
              name: true,
              imageUrl: true,
            },
          },
          movie: {
            select: {
              title: true,
              year: true,
              director: true,
            },
          },
        },
      })

      try {
        revalidatePath(`/r/${rating.slug || rating.id}`)
        revalidatePath('/dashboard')
        revalidatePath('/api/user/ratings')
      } catch {}
      return NextResponse.json(rating)
    }

    // Create new rating
    const shareScore = Math.round(baseWeightedScore)
    const rating = await prisma.rating.create({
      data: {
        userId: session.user.id,
        actorId,
        movieId,
        emotionalRangeDepth,
        characterBelievability,
        technicalSkill,
        screenPresence,
        chemistryInteraction,
        weightedScore,
        shareScore,
        comment,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            isVerifiedRater: true,
          },
        },
        actor: {
          select: {
            name: true,
            imageUrl: true,
          },
        },
        movie: {
          select: {
            title: true,
            year: true,
            director: true,
          },
        },
      },
    })

    // Update user's rating count and check verified rater status
    // no user rating counters in simplified model

    // Check if user should be promoted to verified rater
    // removed verified rater promotion

    try {
      revalidatePath(`/r/${rating.slug || rating.id}`)
      revalidatePath('/dashboard')
      revalidatePath('/api/user/ratings')
    } catch {}
    return NextResponse.json(rating, { status: 201 })
  } catch (error) {
    console.error("Error creating rating:", error)
    return NextResponse.json(
      { error: "Failed to create rating" },
      { status: 500 }
    )
  }
} 