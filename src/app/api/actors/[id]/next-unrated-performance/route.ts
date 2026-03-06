import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/actors/[id]/next-unrated-performance
 * Returns up to 6 unrated performances (same actor) the current user has not yet rated.
 * Query: currentMovieId (optional) — exclude the just-rated movie.
 * Response: { performances: Array<{ movieSlug, actorSlug, movieTitle, movieYear }> }
 *           Empty array when nothing left to rate.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      }
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: actorIdOrSlug } = await params
    const { searchParams } = new URL(request.url)
    const currentMovieId = searchParams.get('currentMovieId') ?? undefined

    let actorId = actorIdOrSlug
    if (!UUID_REGEX.test(actorIdOrSlug)) {
      const actor = await prisma.actor.findUnique({
        where: { slug: actorIdOrSlug },
        select: { id: true }
      })
      if (!actor) {
        return NextResponse.json({ error: 'Actor not found' }, { status: 404 })
      }
      actorId = actor.id
    }

    const ratedMovieIds = new Set(
      (
        await prisma.rating.findMany({
          where: { actorId, userId: user.id },
          select: { movieId: true }
        })
      ).map((r) => r.movieId)
    )

    const performances = await prisma.performance.findMany({
      where: { actorId },
      include: {
        movie: { select: { id: true, title: true, slug: true, year: true } },
        actor: { select: { slug: true } }
      },
      orderBy: { movie: { year: 'desc' } }
    })

    const seenMovies = new Set<string>()
    const totalPerformances = performances.filter((p) => {
      if (seenMovies.has(p.movieId)) return false
      seenMovies.add(p.movieId)
      return true
    }).length
    const userRatedCount = ratedMovieIds.size

    seenMovies.clear()
    const results: { movieSlug: string; actorSlug: string; movieTitle: string; movieYear: number }[] = []

    for (const p of performances) {
      if (results.length >= 6) break
      if (seenMovies.has(p.movieId)) continue
      seenMovies.add(p.movieId)
      if (ratedMovieIds.has(p.movieId)) continue
      if (currentMovieId && p.movieId === currentMovieId) continue
      results.push({
        movieSlug: p.movie.slug ?? p.movie.id,
        actorSlug: p.actor.slug ?? actorId,
        movieTitle: p.movie.title,
        movieYear: p.movie.year,
      })
    }

    return NextResponse.json({
      performances: results,
      totalPerformances,
      userRatedCount,
    })
  } catch (err) {
    console.error('next-unrated-performance error', err)
    return NextResponse.json(
      { error: 'Failed to get next unrated performance' },
      { status: 500 }
    )
  }
}
