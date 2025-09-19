import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"
import { resolveCharacterDisplay } from "@/lib/character"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
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

    // Fetch performances and left-join ratings to capture roleName if present
    const performances = await prisma.performance.findMany({
      include: {
        user: { select: { name: true, email: true } },
        actor: { select: { name: true, imageUrl: true } },
        movie: { select: { title: true, year: true, director: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100, // Limit results for better performance
    })

    // Fetch role names for these performance triplets (userId, actorId, movieId)
    const roleNameByKey = new Map<string, string | null>()
    if (performances.length > 0) {
      const ratings = await prisma.rating.findMany({
        where: {
          OR: performances.map((p) => ({
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

    const withRoleName = performances.map((p) => {
      const roleName = roleNameByKey.get(`${p.userId}:${p.actorId}:${p.movieId}`) ?? null
      const character = resolveCharacterDisplay({ character: (p as any).character, roleName, comment: p.comment as any })
      return { ...p, roleName, character }
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

    // Check if a row exists for this user/actor/movie
    const existingPerformance = await prisma.performance.findUnique({
      where: {
        userId_actorId_movieId: {
          userId: session.user.id,
          actorId,
          movieId,
        },
      },
    })

    if (existingPerformance) {
      // Update existing performance rating
      const performance = await prisma.performance.update({
        where: {
          id: existingPerformance.id,
        },
        data: {
          emotionalRangeDepth,
          characterBelievability,
          technicalSkill,
          screenPresence,
          chemistryInteraction,
          comment,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
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

      return NextResponse.json(performance)
    }

    // If no row exists for this user, try to claim a seeded row (seed user) if present
    const seedEmail = process.env.SEED_USER_EMAIL || "seed_user@example.com"
    const seedUser = await prisma.user.findUnique({ where: { email: seedEmail } })

    let performance
    if (seedUser) {
      const seeded = await prisma.performance.findUnique({
        where: {
          userId_actorId_movieId: {
            userId: seedUser.id,
            actorId,
            movieId,
          },
        },
      })

      if (seeded) {
        performance = await prisma.performance.update({
          where: { id: seeded.id },
          data: {
            userId: session.user.id,
            emotionalRangeDepth,
            characterBelievability,
            technicalSkill,
            screenPresence,
            chemistryInteraction,
            comment,
          },
          include: {
            user: { select: { name: true, email: true } },
            actor: { select: { name: true, imageUrl: true } },
            movie: { select: { title: true, year: true, director: true } },
          },
        })
      }
    }

    // Fallback: Create new performance rating if no seeded row to claim
    if (!performance) {
      performance = await prisma.performance.create({
        data: {
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
          user: { select: { name: true, email: true } },
          actor: { select: { name: true, imageUrl: true } },
          movie: { select: { title: true, year: true, director: true } },
        },
      })
    }

    return NextResponse.json(performance, { status: 201 })
  } catch (error) {
    console.error("Error creating performance rating:", error)
    return NextResponse.json(
      { error: "Failed to create performance rating" },
      { status: 500 }
    )
  }
} 