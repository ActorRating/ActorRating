export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const FIELDS = [
  'emotionalRangeDepth',
  'characterBelievability',
  'technicalSkill',
  'screenPresence',
  'chemistryInteraction',
] as const

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
    const ratings = await prisma.rating.findMany({
      where: { actorId, movieId },
      select: {
        emotionalRangeDepth: true,
        characterBelievability: true,
        technicalSkill: true,
        screenPresence: true,
        chemistryInteraction: true,
      },
    })

    if (ratings.length === 0) {
      const res = NextResponse.json({ avg10: null, count: 0 })
      res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
      return res
    }

    const perRating = ratings.map((r) => {
      const vals = FIELDS.map((f) => r[f]).filter((v): v is number => typeof v === 'number')
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
    })
    const avg100 = perRating.reduce((s, v) => s + v, 0) / perRating.length
    const avg10 = avg100 > 0 ? Number((avg100 / 10).toFixed(1)) : null

    const dimensions: Record<string, number | null> = {}
    for (const field of FIELDS) {
      const vals = ratings.map((r) => r[field]).filter((v): v is number => typeof v === 'number')
      if (vals.length === 0) {
        dimensions[field] = null
      } else {
        const dimAvg100 = vals.reduce((s, v) => s + v, 0) / vals.length
        dimensions[field] = dimAvg100 > 0 ? Number((dimAvg100 / 10).toFixed(1)) : null
      }
    }

    const res = NextResponse.json({ avg10, count: ratings.length, dimensions })
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
    return res
  } catch (err) {
    console.error('community-stats error', err)
    return NextResponse.json({ error: 'Failed to fetch community stats' }, { status: 500 })
  }
}
