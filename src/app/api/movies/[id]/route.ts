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
    const movie = await prisma.movie.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        title: true,
        year: true,
        director: true,
        genre: true,
        overview: true,
        tmdbId: true,
        performances: {
          select: {
            id: true,
            userId: true,
            actorId: true,
            movieId: true,
            comment: true,
            updatedAt: true,
            actor: { select: { id: true, name: true, imageUrl: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 300,
        },
        ratings: {
          select: {
            actorId: true,
            emotionalRangeDepth: true,
            characterBelievability: true,
            technicalSkill: true,
            screenPresence: true,
            chemistryInteraction: true,
          },
          take: 2000,
        },
      },
    })

    if (!movie) {
      return NextResponse.json(
        { error: "Movie not found" },
        { status: 404 }
      )
    }

    // Attach roleName to performances.
    // Strategy:
    // 1) Prefer an aggregated role per actor in this movie (most frequent non-empty rating.roleName).
    // 2) Fallback to a direct join on the exact (userId, actorId, movieId) if aggregation is empty.
    let enriched = movie
    try {
      const perfs = movie?.performances || []
      if (perfs.length > 0) {
        // Optional TMDB enrichment map: actor name -> character
        let tmdbCharacterByName: Map<string, string> | null = null
        try {
          if (movie.tmdbId) {
            const credits = await getMovieCredits(movie.tmdbId)
            tmdbCharacterByName = new Map(credits.cast.map(c => [c.name.trim(), c.character.trim()]))
          }
        } catch {}

        // Build aggregated role per actor for this movie
        const aggRatings = await prisma.rating.findMany({
          where: { movieId: id, roleName: { not: null } },
          select: { actorId: true, roleName: true },
          take: 5000,
        })
        const aggByActor = new Map<string, string | null>()
        const countsByActor = new Map<string, Map<string, number>>()
        for (const r of aggRatings) {
          const actorId = r.actorId
          const name = (r.roleName || '').trim()
          if (!name) continue
          const m = countsByActor.get(actorId) ?? new Map<string, number>()
          m.set(name, (m.get(name) ?? 0) + 1)
          countsByActor.set(actorId, m)
        }
        for (const [actorId, freq] of countsByActor.entries()) {
          let bestName: string | null = null
          let bestCount = -1
          for (const [name, count] of freq.entries()) {
            if (count > bestCount) { bestCount = count; bestName = name }
          }
          aggByActor.set(actorId, bestName)
        }

        // Fallback join on exact triplet for any remaining
        const directRatings = await prisma.rating.findMany({
          where: {
            OR: perfs.map((p) => ({ userId: p.userId, actorId: p.actorId, movieId: p.movieId })),
          },
          select: { userId: true, actorId: true, movieId: true, roleName: true },
        })
        const directMap = new Map<string, string | null>()
        for (const r of directRatings) directMap.set(`${r.userId}:${r.actorId}:${r.movieId}`, (r.roleName || '').trim() || null)

        const performancesWithRole = perfs.map((p) => {
          const roleName = aggByActor.get(p.actorId) ?? directMap.get(`${p.userId}:${p.actorId}:${p.movieId}`) ?? null
          // Try TMDB fallback if character is unknown/empty
          const tmdbName = p.actor?.name ? (tmdbCharacterByName?.get(p.actor.name.trim()) || null) : null
          const character = resolveCharacterDisplay({ character: (p as any).character ?? tmdbName, roleName, comment: p.comment as any })
          return { ...p, roleName, character }
        })
        enriched = { ...movie, performances: performancesWithRole } as typeof movie
      }
    } catch {}

    const res = NextResponse.json(enriched)
    res.headers.set('Cache-Control', 'public, max-age=120, s-maxage=600, stale-while-revalidate=1200')
    return res
  } catch (error) {
    console.error("Error fetching movie:", error)
    return NextResponse.json(
      { error: "Failed to fetch movie" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { title, year, director, genre, tmdbId, overview } = body

    const movie = await prisma.movie.update({
      where: {
        id: id,
      },
      data: {
        title,
        year: year ? parseInt(year) : undefined,
        director,
        genre,
        tmdbId: tmdbId ? parseInt(tmdbId) : undefined,
        overview,
      },
    })

    return NextResponse.json(movie)
  } catch (error) {
    console.error("Error updating movie:", error)
    return NextResponse.json(
      { error: "Failed to update movie" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    await prisma.movie.delete({
      where: {
        id: id,
      },
    })

    return NextResponse.json({ message: "Movie deleted successfully" })
  } catch (error) {
    console.error("Error deleting movie:", error)
    return NextResponse.json(
      { error: "Failed to delete movie" },
      { status: 500 }
    )
  }
} 