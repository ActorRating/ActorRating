import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"
import { createServerClient } from "@supabase/ssr"
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
  console.log("=== RATING API CALLED ===")
  console.log("Request URL:", request.url)
  console.log("Request method:", request.method)
  console.log("Headers:", Object.fromEntries(request.headers.entries()))
  
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )
    
    // Debug cookies
    const cookies = request.cookies.getAll()
    console.log("Request cookies:", cookies.map(c => ({ name: c.name, hasValue: !!c.value })))
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log("Session check:", { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      userId: session?.user?.id,
      sessionError: sessionError?.message,
      cookieCount: cookies.length
    })
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to submit ratings." },
        { status: 401 }
      )
    }

    console.log("Authenticated user found:", session.user.id)

    // Use the helper function for authenticated users
    const result = await handleRatingSubmission(request, session.user.id)
    
    // Return the result with proper cookies
    if (result.status === 201) {
      const data = await result.json()
      const finalResponse = NextResponse.json(data, { status: 201 })
      
      // Copy cookies from our response
      response.cookies.getAll().forEach(cookie => {
        finalResponse.cookies.set(cookie.name, cookie.value, cookie)
      })
      
      return finalResponse
    }
    
    return result
  } catch (error) {
    console.error("=== RATING API ERROR ===")
    console.error("Error creating rating:", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : 'No cause'
    })
    
    // Log environment info for debugging
    console.error("Environment info:", {
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL
    })
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: "Invalid data provided. Please refresh the page and try again.", debug: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: "You have already rated this performance.", debug: error.message },
          { status: 409 }
        )
      }
      if (error.message.includes('Authentication')) {
        return NextResponse.json(
          { error: "Authentication failed. Please sign in again.", debug: error.message },
          { status: 401 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: "Failed to create rating. Please try again.", 
        debug: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Helper function to handle rating submission logic
async function handleRatingSubmission(request: NextRequest, userId: string) {
  console.log("Starting handleRatingSubmission for user:", userId)
  
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
  console.log("Request body received:", { 
    actorId: body.actorId,
    movieId: body.movieId,
    hasRecaptchaToken: !!body.recaptchaToken 
  })
  
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
    if (rating === undefined || rating === null || isNaN(rating) || rating < 0 || rating > 100) {
      return NextResponse.json(
        { error: "All ratings must be valid numbers between 0 and 100" },
        { status: 400 }
      )
    }
  }

  // Validate that actor and movie exist and are associated
  console.log("Validating performance for:", { actorId, movieId })
  const performance = await prisma.performance.findFirst({
    where: {
      actorId: actorId,
      movieId: movieId
    },
    include: {
      actor: true,
      movie: true
    }
  })
  
  console.log("Performance validation result:", { found: !!performance, performanceId: performance?.id })
  
  if (!performance) {
    return NextResponse.json(
      { error: "Invalid actor and movie combination. This actor did not appear in this movie." },
      { status: 400 }
    )
  }

  // Calculate weighted score
  const baseWeightedScore = 
    emotionalRangeDepth * 0.25 +
    characterBelievability * 0.25 +
    technicalSkill * 0.20 +
    screenPresence * 0.15 +
    chemistryInteraction * 0.15

  const weightedScore = baseWeightedScore

  // Check if user has already rated this performance
  const existingRating = await prisma.rating.findUnique({
    where: {
      userId_actorId_movieId: {
        userId: userId,
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

  try {
    // Create new rating
    const shareScore = Math.round(baseWeightedScore)
    const rating = await prisma.rating.create({
      data: {
        userId: userId,
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
    return NextResponse.json(rating, { status: 201 })
  } catch (error) {
    console.error("=== HELPER FUNCTION ERROR ===")
    console.error("Error in handleRatingSubmission:", error)
    console.error("Helper error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown'
    })
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: "Invalid data provided. Please refresh the page and try again.", debug: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: "You have already rated this performance.", debug: error.message },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: "Failed to create rating. Please try again.", 
        debug: error instanceof Error ? error.message : 'Unknown error',
        location: "handleRatingSubmission"
      },
      { status: 500 }
    )
  }
} 