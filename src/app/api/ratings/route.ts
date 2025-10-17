import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createServerClient } from "@supabase/ssr"
import { checkRateLimit } from "@/lib/rateLimit"
import { verifyRecaptchaV3 } from "@/lib/recaptcha"
import { revalidatePath } from "next/cache"

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
    return NextResponse.json(
      { error: "Failed to fetch ratings" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  console.log("=== RATING API CALLED ===")
  
  try {
    // Simple Supabase client setup
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // No-op for API routes
          },
        },
      }
    )
    
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log("Session status:", { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      userId: session?.user?.id,
      error: sessionError?.message 
    })
    
    // Development bypass for localhost only
    let userId = session?.user?.id
    if (!userId && process.env.NODE_ENV === 'development') {
      const host = request.headers.get('host')
      if (host?.includes('localhost') || host?.includes('127.0.0.1')) {
        userId = `dev-user-${Date.now()}`
        console.log("🚧 Development bypass activated for localhost:", userId)
      }
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Parse request body
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

    console.log("Request data:", { actorId, movieId, hasToken: !!recaptchaToken })

    // Basic validation
    if (!actorId || !movieId) {
      return NextResponse.json(
        { error: "Actor ID and Movie ID are required" },
        { status: 400 }
      )
    }

    // Validate rating values
    const ratings = [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction]
    for (const rating of ratings) {
      if (typeof rating !== 'number' || rating < 0 || rating > 100) {
        return NextResponse.json(
          { error: "All ratings must be numbers between 0 and 100" },
          { status: 400 }
        )
      }
    }

    // Verify reCAPTCHA (with bypass for development)
    if (recaptchaToken && recaptchaToken !== 'dev_mock_token_submit_rating_123') {
      const recaptchaResult = await verifyRecaptchaV3(recaptchaToken, "submit_rating", 0.5)
      if (!recaptchaResult.success) {
        return NextResponse.json(
          { error: "reCAPTCHA verification failed" },
          { status: 403 }
        )
      }
    }

    // Check rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = await checkRateLimit(clientIp, 'rating')
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      )
    }

    // Validate actor/movie combination exists
    const performance = await prisma.performance.findFirst({
      where: { actorId, movieId }
    })
    
    if (!performance) {
      return NextResponse.json(
        { error: "Invalid actor/movie combination" },
        { status: 400 }
      )
    }

    // Calculate weighted score
    const weightedScore = 
      emotionalRangeDepth * 0.25 +
      characterBelievability * 0.25 +
      technicalSkill * 0.20 +
      screenPresence * 0.15 +
      chemistryInteraction * 0.15

    const shareScore = Math.round(weightedScore)

    console.log("Creating rating for user:", userId)

    // Check if rating already exists
    const existingRating = await prisma.rating.findUnique({
      where: {
        userId_actorId_movieId: {
          userId,
          actorId,
          movieId,
        },
      },
    })

    let rating
    if (existingRating) {
      // Update existing rating
      rating = await prisma.rating.update({
        where: { id: existingRating.id },
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
          actor: { select: { name: true, imageUrl: true } },
          movie: { select: { title: true, year: true, director: true } },
        },
      })
      console.log("Updated existing rating:", rating.id)
    } else {
      // Create new rating
      rating = await prisma.rating.create({
        data: {
          userId,
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
          actor: { select: { name: true, imageUrl: true } },
          movie: { select: { title: true, year: true, director: true } },
        },
      })
      console.log("Created new rating:", rating.id)
    }

    // Revalidate cache
    try {
      revalidatePath('/dashboard')
    } catch (e) {
      console.log("Cache revalidation failed:", e)
    }

    return NextResponse.json(rating, { status: 201 })

  } catch (error) {
    console.error("=== RATING API ERROR ===")
    console.error("Full error:", error)
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: "Invalid data - actor or movie not found" },
          { status: 400 }
        )
      }
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: "Rating already exists" },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Internal server error", debug: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}