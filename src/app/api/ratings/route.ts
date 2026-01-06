// src/app/api/ratings/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createServerClient } from "@supabase/ssr"
import { checkRateLimit } from "@/lib/rateLimit"
import { verifyRecaptchaV3 } from "@/lib/recaptcha"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"

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

// Unified handler for POST (create) and PUT (update)
async function handleRating(request: NextRequest, isUpdate: boolean) {
  try {
    console.log("=== RATING API CALLED ===", { method: isUpdate ? 'PUT' : 'POST' })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            return
          },
        },
      }
    )

    // Get user (more reliable than getSession for API routes)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    console.log("Rating API - Auth status:", { 
      hasUser: !!user, 
      userId: user?.id,
      error: userError?.message 
    })

    let userId = user?.id
    // Development bypass
    if (!userId && process.env.NODE_ENV === 'development') {
      const host = request.headers.get('host')
      if (host?.includes('localhost') || host?.includes('127.0.0.1')) {
        userId = `dev-user-${Date.now()}`
        console.log("🚧 Development bypass activated:", userId)
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      ratingId, actorId, movieId,
      emotionalRangeDepth, characterBelievability,
      technicalSkill, screenPresence, chemistryInteraction,
      comment, recaptchaToken, breakdown, weightedScore: providedWeightedScore
    } = body

    // Validate required fields
    if (!actorId || !movieId) {
      return NextResponse.json({ error: "Actor ID and Movie ID are required" }, { status: 400 })
    }

    // Validate actorId and movieId are TEXT strings (not UUIDs)
    if (typeof actorId !== 'string' || typeof movieId !== 'string') {
      return NextResponse.json({ error: "Actor ID and Movie ID must be strings" }, { status: 400 })
    }

    // Ensure userId is stored as TEXT (from Supabase Auth UUID, stored as string)
    if (typeof userId !== 'string') {
      return NextResponse.json({ error: "User ID must be a string" }, { status: 400 })
    }

    // Validate rating values
    const ratings = [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction]
    for (const r of ratings) {
      if (typeof r !== 'number' || r < 0 || r > 100) {
        return NextResponse.json({ error: "Ratings must be numbers between 0 and 100" }, { status: 400 })
      }
    }

    // Verify reCAPTCHA (required for unauthenticated users)
    // Skip reCAPTCHA for authenticated users (they've already passed auth)
    // Also allow bypass tokens for post-signup/post-signin submissions
    const bypassTokens = ['dev_mock_token_submit_rating_123', 'bypass']
    const isBypassToken = recaptchaToken && bypassTokens.includes(recaptchaToken)
    const shouldSkipRecaptcha = userId || isBypassToken
    
    if (!shouldSkipRecaptcha) {
      if (!recaptchaToken) {
        return NextResponse.json({ error: "reCAPTCHA token is required" }, { status: 400 })
      }
      
      const recaptchaResult = await verifyRecaptchaV3(recaptchaToken, "submit_rating", 0.5)
      if (!recaptchaResult.success) {
        console.error("reCAPTCHA verification failed:", recaptchaResult.error)
        return NextResponse.json({ 
          error: "reCAPTCHA verification failed", 
          debug: recaptchaResult.error 
        }, { status: 403 })
      }
    }

    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    let rateLimitResult
    try {
      rateLimitResult = await checkRateLimit(clientIp, 'rating')
    } catch (rateLimitError) {
      console.error("Rate limit check failed (allowing request):", rateLimitError)
      // If rate limiting fails, allow the request but log the error
      rateLimitResult = { allowed: true, remaining: 999, resetTime: new Date() }
    }
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    // Validate actor and movie exist
    console.log("Validating actor and movie:", { actorId, movieId })
    let actor, movie
    try {
      [actor, movie] = await Promise.all([
        prisma.actor.findUnique({ where: { id: actorId } }),
        prisma.movie.findUnique({ where: { id: movieId } })
      ])
    } catch (dbError) {
      console.error("Database error during actor/movie lookup:", dbError)
      throw dbError
    }
    
    if (!actor) {
      console.error("Actor not found:", actorId)
      return NextResponse.json({ error: "Actor not found" }, { status: 400 })
    }
    
    if (!movie) {
      console.error("Movie not found:", movieId)
      return NextResponse.json({ error: "Movie not found" }, { status: 400 })
    }
    
    console.log("Actor and movie validated:", { actorName: actor.name, movieTitle: movie.title })

    // Calculate weighted score (server-side calculation, or use provided if valid)
    const calculatedWeightedScore = emotionalRangeDepth * 0.25 +
                                    characterBelievability * 0.25 +
                                    technicalSkill * 0.2 +
                                    screenPresence * 0.15 +
                                    chemistryInteraction * 0.15
    const weightedScore = (typeof providedWeightedScore === 'number' && providedWeightedScore >= 0 && providedWeightedScore <= 100) 
      ? providedWeightedScore 
      : calculatedWeightedScore
    const shareScore = Math.round(weightedScore)

    let rating
    if (isUpdate) {
      if (!ratingId) {
        return NextResponse.json({ error: "Rating ID required for update" }, { status: 400 })
      }

      rating = await prisma.rating.update({
        where: { id: ratingId },
        data: {
          emotionalRangeDepth,
          characterBelievability,
          technicalSkill,
          screenPresence,
          chemistryInteraction,
          weightedScore,
          shareScore,
          comment,
          breakdown: breakdown !== undefined ? breakdown : undefined, // Update breakdown if provided
        },
        include: {
          actor: { select: { name: true, imageUrl: true } },
          movie: { select: { title: true, year: true, director: true } },
        },
      })
      console.log("Updated rating:", rating.id)
    } else {
      // Check if rating already exists
      const existing = await prisma.rating.findUnique({
        where: { userId_actorId_movieId: { userId, actorId, movieId } }
      })

      if (existing) {
        // If exists, update instead
        rating = await prisma.rating.update({
          where: { id: existing.id },
          data: { 
            emotionalRangeDepth, 
            characterBelievability, 
            technicalSkill, 
            screenPresence, 
            chemistryInteraction, 
            weightedScore, 
            shareScore, 
            comment,
            breakdown: breakdown !== undefined ? breakdown : existing.breakdown // Update breakdown if provided
          },
          include: { actor: { select: { name: true, imageUrl: true } }, movie: { select: { title: true, year: true, director: true } } },
        })
        console.log("Updated existing rating:", rating.id)
      } else {
        // Generate TEXT ID: "rating_" + nanoid()
        const ratingId = `rating_${nanoid()}`
        
        console.log("Creating new rating:", { 
          ratingId, 
          userId, 
          actorId, 
          movieId,
          weightedScore,
          shareScore
        })
        
        try {
          rating = await prisma.rating.create({
            data: { 
              id: ratingId,
              userId: String(userId), // Ensure TEXT format (UUID from Supabase stored as TEXT)
              actorId: String(actorId), // Ensure TEXT format
              movieId: String(movieId), // Ensure TEXT format
              emotionalRangeDepth, 
              characterBelievability, 
              technicalSkill, 
              screenPresence, 
              chemistryInteraction, 
              weightedScore, 
              shareScore, 
              comment,
              breakdown: breakdown || null // Optional breakdown field
            },
            include: { actor: { select: { name: true, imageUrl: true } }, movie: { select: { title: true, year: true, director: true } } },
          })
          console.log("Created new rating:", rating.id)
        } catch (createError) {
          console.error("Error creating rating:", createError)
          if (createError instanceof Error) {
            console.error("Create error details:", {
              name: createError.name,
              message: createError.message,
              stack: createError.stack
            })
          }
          throw createError
        }
      }
    }

    // Revalidate dashboard cache
    try { revalidatePath('/dashboard') } catch (e) { console.log("Cache revalidation failed:", e) }

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
    }
    return NextResponse.json({ error: "Internal server error", debug: error instanceof Error ? error.message : 'Unknown' }, { status: 500 })
  }
}
