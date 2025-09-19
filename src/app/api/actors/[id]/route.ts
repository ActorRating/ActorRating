import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveCharacterDisplay } from "@/lib/character"
import { getMovieCredits } from "@/lib/tmdb"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const actor = await prisma.actor.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        name: true,
        bio: true,
        imageUrl: true,
        birthDate: true,
        nationality: true,
        knownFor: true,
        performances: {
          select: {
            id: true,
            userId: true,
            actorId: true,
            movieId: true,
            comment: true,
            createdAt: true,
            updatedAt: true,
            movie: { select: { id: true, title: true, year: true, director: true, tmdbId: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 200,
        },
        ratings: {
          select: {
            movieId: true,
            weightedScore: true,
            emotionalRangeDepth: true,
            characterBelievability: true,
            technicalSkill: true,
            screenPresence: true,
            chemistryInteraction: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        },
      },
    })

    if (!actor) {
      return NextResponse.json(
        { error: "Actor not found" },
        { status: 404 }
      )
    }
    // Attach roleName to performances.
    // Strategy:
    // 1) Prefer an aggregated role per movie for this actor (most frequent non-empty roleName for that movie).
    // 2) Fallback to a direct join on exact (userId, actorId, movieId).
    let enriched = actor
    try {
      const perfs = actor?.performances || []
      if (perfs.length > 0) {
        // Aggregate per movie for this actor
        const movieIds = Array.from(new Set(perfs.map(p => p.movieId)))
        const aggRatings = await prisma.rating.findMany({
          where: { actorId: (actor as any).id, movieId: { in: movieIds }, roleName: { not: null } },
          select: { movieId: true, roleName: true },
          take: 5000,
        })
        const aggByMovie = new Map<string, string | null>()
        const countsByMovie = new Map<string, Map<string, number>>()
        for (const r of aggRatings) {
          const movieId = r.movieId
          const name = (r.roleName || '').trim()
          if (!name) continue
          const m = countsByMovie.get(movieId) ?? new Map<string, number>()
          m.set(name, (m.get(name) ?? 0) + 1)
          countsByMovie.set(movieId, m)
        }
        for (const [movieId, freq] of countsByMovie.entries()) {
          let bestName: string | null = null
          let bestCount = -1
          for (const [name, count] of freq.entries()) {
            if (count > bestCount) { bestCount = count; bestName = name }
          }
          aggByMovie.set(movieId, bestName)
        }

        // Fallback direct join for any remaining
        const directRatings = await prisma.rating.findMany({
          where: {
            OR: perfs.map((p) => ({ userId: p.userId, actorId: p.actorId, movieId: p.movieId })),
          },
          select: { userId: true, actorId: true, movieId: true, roleName: true },
        })
        const directMap = new Map<string, string | null>()
        for (const r of directRatings) directMap.set(`${r.userId}:${r.actorId}:${r.movieId}`, (r.roleName || '').trim() || null)

        // Preload TMDB cast per movie for this actor page
        const uniqueMovieIds = Array.from(new Set(perfs.map(p => p.movieId)))
        const tmdbByMovieId = new Map<string, Map<string, string>>()
        for (const movieId of uniqueMovieIds) {
          try {
            const perf = perfs.find(x => x.movieId === movieId)
            const tmdbId = perf?.movie?.tmdbId
            if (tmdbId) {
              const credits = await getMovieCredits(tmdbId)
              tmdbByMovieId.set(movieId, new Map(credits.cast.map(c => [c.name.trim(), c.character.trim()])))
            }
          } catch {}
        }

        const performancesWithRole = perfs.map((p) => {
          const roleName = aggByMovie.get(p.movieId) ?? directMap.get(`${p.userId}:${p.actorId}:${p.movieId}`) ?? null
          const tmdbMap = tmdbByMovieId.get(p.movieId)
          const tmdbName = (actor as any)?.name ? (tmdbMap?.get((actor as any).name.trim()) || null) : null
          const character = resolveCharacterDisplay({ character: (p as any).character ?? tmdbName, roleName, comment: p.comment as any })
          return { ...p, roleName, character }
        })
        enriched = { ...actor, performances: performancesWithRole } as typeof actor
      }
    } catch {}

    const res = NextResponse.json(enriched)
    res.headers.set('Cache-Control', 'public, max-age=120, s-maxage=600, stale-while-revalidate=1200')
    return res
  } catch (error) {
    console.error("Error fetching actor:", error)
    return NextResponse.json(
      { error: "Failed to fetch actor" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, bio, imageUrl, birthDate, nationality, tmdbId, knownFor } = body

    const actor = await prisma.actor.update({
      where: {
        id: id,
      },
      data: {
        name,
        bio,
        imageUrl,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        nationality,
        tmdbId: tmdbId ? parseInt(tmdbId) : undefined,
        knownFor,
      },
    })

    return NextResponse.json(actor)
  } catch (error) {
    console.error("Error updating actor:", error)
    return NextResponse.json(
      { error: "Failed to update actor" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.actor.delete({
      where: {
        id: id,
      },
    })

    return NextResponse.json({ message: "Actor deleted successfully" })
  } catch (error) {
    console.error("Error deleting actor:", error)
    return NextResponse.json(
      { error: "Failed to delete actor" },
      { status: 500 }
    )
  }
} 