import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"
import { resolveCharacterDisplay } from "@/lib/character"
import supabaseServer from "@/lib/supabaseServer"
import { verifyRecaptchaV3 } from "@/lib/recaptcha"
import { checkRateLimit } from "@/lib/rateLimit"

export async function GET() {
  try {
    // Add caching for performance list
    const cacheKey = makeCacheKey('performances:list', ['recent'])
    const cached = await cacheGet<any[]>(cacheKey)
    if (cached) {
      const res = NextResponse.json(cached)
      res.headers.set('Cache-Control', 'public, max-age=120, s-maxage=600, stale-while-revalidate=1200')
      return res
    }

    // Fetch performances with actor and movie relations
    // CRITICAL: Only return performances where both actor AND movie exist in database
    // Order by movie year DESC to prioritize recent movies, then by createdAt for variety
    const performances = await prisma.performance.findMany({
      where: {
        actor: {
          isNot: null  // Ensure actor exists
        },
        movie: {
          isNot: null  // Ensure movie exists
        }
      },
      include: {
        actor: { 
          select: { 
            id: true, 
            name: true, 
            imageUrl: true 
          } 
        },
        movie: { 
          select: { 
            id: true, 
            title: true, 
            year: true, 
            director: true 
          } 
        },
      },
      orderBy: [
        { movie: { year: "desc" } },
        { createdAt: "desc" }
      ],
      take: 200,  // Increased to get more variety
    })

    // Filter out any performances where actor or movie is null (extra safety)
    const validPerformances = performances.filter(p => 
      p.actor && 
      p.movie && 
      p.actorId && 
      p.movieId &&
      p.actor.id &&
      p.movie.id &&
      p.actor.name &&
      p.movie.title
    )

    // Fetch role names for these performance triplets (userId, actorId, movieId)
    const roleNameByKey = new Map<string, string | null>()
    if (validPerformances.length > 0) {
      const ratings = await prisma.rating.findMany({
        where: {
          OR: validPerformances.map((p) => ({
            userId: p.userId,
            actorId: p.actorId,
            movieId: p.movieId,
          })),
        },
        select: { userId: true, actorId: true, movieId: true, roleName: true },
      })
      for (const r of ratings) {
        roleNameByKey.set(`${r.userId}:${r.actorId}:${r.movieId}`, r.roleName ?? null)
      }
    }

    // Map performances with character/roleName display
    const withRoleName = validPerformances.map((p) => {
      const roleName = roleNameByKey.get(`${p.userId}:${p.actorId}:${p.movieId}`) ?? null
      const character = resolveCharacterDisplay({ 
        character: (p as any).character, 
        roleName, 
        comment: p.comment as any 
      })
      
      // Return performance with explicit IDs at top level for easy access
      return { 
        ...p, 
        roleName, 
        character,
        // Ensure IDs are always at top level for UI
        actorId: p.actorId,
        movieId: p.movieId,
        actor: {
          ...p.actor,
          id: p.actor.id
        },
        movie: {
          ...p.movie,
          id: p.movie.id
        }
      }
    })

    await cacheSet(cacheKey, withRoleName, 120)
    const res = NextResponse.json(withRoleName)
    res.headers.set('Cache-Control', 'public, max-age=120, s-maxage=600, stale-while-revalidate=1200')
    return res
  } catch (error) {
    console.error("Error fetching performances:", error)
    return NextResponse.json(
      { error: "Failed to fetch performances" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseServer
    const { data: { session } } = await supabase.auth.getSession()
    
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

    // Check rate limiting for performance submissions
    const rateLimitResult = await checkRateLimit(clientIp, 'rating')
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: "Too many performance submissions. Please try again later.",
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

    // Verify that actor and movie exist before creating performance
    const actor = await prisma.actor.findUnique({ where: { id: actorId } })
    const movie = await prisma.movie.findUnique({ where: { id: movieId } })

    if (!actor) {
      return NextResponse.json(
        { error: "Actor not found" },
        { status: 404 }
      )
    }

    if (!movie) {
      return NextResponse.json(
        { error: "Movie not found" },
        { status: 404 }
      )
    }

    // Upsert by unique compound key
    const performance = await prisma.performance.upsert({
      where: {
        userId_actorId_movieId: {
          userId: session.user.id,
          actorId,
          movieId,
        },
      },
      update: {
        emotionalRangeDepth,
        characterBelievability,
        technicalSkill,
        screenPresence,
        chemistryInteraction,
        comment,
      },
      create: {
        userId: session.user.id,
        actorId,
        movieId,
        emotionalRangeDepth,
        characterBelievability,
        technicalSkill,
        screenPresence,
        chemistryInteraction,
        comment,
      },
      include: {
        actor: { select: { id: true, name: true, imageUrl: true } },
        movie: { select: { id: true, title: true, year: true, director: true } },
      },
    })

    return NextResponse.json(performance, { status: 201 })
  } catch (error) {
    console.error("Error creating performance rating:", error)
    return NextResponse.json(
      { error: "Failed to create performance rating" },
      { status: 500 }
    )
  }
}
