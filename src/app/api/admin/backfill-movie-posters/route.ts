export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMovieDetails, buildPosterUrl, rateLimitTmdb } from '@/lib/tmdb'

/**
 * POST /api/admin/backfill-movie-posters
 *
 * Iterates over all movies that have a tmdbId but no posterUrl and fetches
 * the poster from TMDB, storing it in Movie.posterUrl.
 *
 * Query params:
 *   limit  — max movies to process per call (default 50)
 *   dryRun — if "true", log what would happen without writing to DB
 *
 * Protected by ADMIN_SECRET header.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret')
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)
  const dryRun = searchParams.get('dryRun') === 'true'

  const movies = await prisma.movie.findMany({
    where: { tmdbId: { not: null }, posterUrl: null, isFeaturette: false },
    select: { id: true, title: true, tmdbId: true },
    take: limit,
  })

  const results: { id: string; title: string; posterUrl: string | null; status: string }[] = []

  for (const movie of movies) {
    try {
      await rateLimitTmdb()
      const details = await getMovieDetails(movie.tmdbId!)
      const posterUrl = buildPosterUrl(details?.posterPath ?? null)

      if (!dryRun && posterUrl) {
        await prisma.movie.update({
          where: { id: movie.id },
          data: { posterUrl },
        })
      }

      results.push({ id: movie.id, title: movie.title, posterUrl, status: posterUrl ? 'updated' : 'no_poster' })
    } catch (err) {
      results.push({ id: movie.id, title: movie.title, posterUrl: null, status: `error: ${String(err)}` })
    }
  }

  const updated = results.filter((r) => r.status === 'updated').length
  const noPoster = results.filter((r) => r.status === 'no_poster').length
  const errors = results.filter((r) => r.status.startsWith('error')).length

  return NextResponse.json({
    processed: movies.length,
    updated,
    noPoster,
    errors,
    dryRun,
    results,
  })
}
