export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCommunityStatsForPair } from '@/lib/ratings/community-stats'

/**
 * GET /api/ratings/community-stats?actorId=X&movieId=Y
 *
 * Lightweight endpoint — returns only the community average (0–10) and rating count
 * for a single actor+movie pair. Used by the rate page to show the score bubble
 * without the overhead of the full /api/performances/by-lookup POST.
 *
 * Response is CDN-cached for 60 s so repeat visits are nearly instant.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const actorId = searchParams.get('actorId')
  const movieId = searchParams.get('movieId')

  if (!actorId || !movieId) {
    return NextResponse.json({ error: 'actorId and movieId are required' }, { status: 400 })
  }

  try {
    const stats = await getCommunityStatsForPair(prisma, actorId, movieId)
    const res = NextResponse.json(stats)
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
    return res
  } catch (err) {
    console.error('community-stats error', err)
    return NextResponse.json({ error: 'Failed to fetch community stats' }, { status: 500 })
  }
}
