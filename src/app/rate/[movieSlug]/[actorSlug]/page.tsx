/**
 * Slug-based rate page: /rate/[movieSlug]/[actorSlug]
 * Returns 410 Gone if movie or actor no longer exists (e.g. removed adult content).
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import RatePageClient from './RatePageClient'

export const dynamic = 'force-dynamic'

export default async function RatePage({
  params,
}: {
  params: Promise<{ movieSlug: string; actorSlug: string }>
}) {
  const { movieSlug, actorSlug } = await params
  if (!movieSlug || !actorSlug) {
    return new NextResponse(null, { status: 410 })
  }

  const [movie, actor] = await Promise.all([
    prisma.movie.findFirst({ where: { slug: movieSlug }, select: { id: true } }),
    prisma.actor.findFirst({ where: { slug: actorSlug }, select: { id: true } }),
  ])

  if (!movie || !actor) {
    return new NextResponse(null, { status: 410, headers: { 'Cache-Control': 'public, max-age=86400' } })
  }

  return <RatePageClient />
}
