export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isFeaturetteMovie, isSelfOrArchiveCredit, matchesFeaturetteTitle } from '@/lib/non-rateable'

/**
 * GET /api/movies/[id]/cast?excludeActorId=X&limit=6
 *
 * Returns other actors who have a performance in this movie,
 * so the rate page can show "More performances from this movie".
 * Public — no authentication required.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: movieId } = await params
  const { searchParams } = new URL(request.url)
  const excludeActorId = searchParams.get('excludeActorId') ?? undefined
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '6', 10), 12)

  try {
    const movie = await prisma.movie.findFirst({
      where: { OR: [{ id: movieId }, { slug: movieId }] },
      select: { id: true, slug: true, title: true, isFeaturette: true },
    })
    if (!movie || isFeaturetteMovie(movie)) {
      if (movie && !movie.isFeaturette && matchesFeaturetteTitle(movie.title)) {
        void prisma.movie
          .update({ where: { id: movie.id }, data: { isFeaturette: true } })
          .catch(() => {})
      }
      return NextResponse.json({ cast: [] })
    }

    const performances = await prisma.performance.findMany({
      where: {
        movieId: movie.id,
        ...(excludeActorId ? { actorId: { not: excludeActorId } } : {}),
      },
      select: {
        character: true,
        actor: { select: { id: true, name: true, slug: true, imageUrl: true } },
        movie: { select: { slug: true } },
      },
      distinct: ['actorId'],
      take: limit * 3,
    })

    const cast = performances
      .filter((p) => !isSelfOrArchiveCredit(p.character))
      .slice(0, limit)
      .map((p) => ({
        actorId: p.actor.id,
        actorName: p.actor.name,
        actorSlug: p.actor.slug,
        actorImageUrl: p.actor.imageUrl,
        movieSlug: p.movie.slug ?? movie.slug,
      }))

    const res = NextResponse.json({ cast })
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    return res
  } catch (err) {
    console.error('cast endpoint error', err)
    return NextResponse.json({ cast: [] })
  }
}
