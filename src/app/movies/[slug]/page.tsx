/**
 * Movie page: /movies/[slug]
 * Returns 410 Gone if movie no longer exists (e.g. removed adult content).
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import MoviePageClient from './MoviePageClient'

export const dynamic = 'force-dynamic'

export default async function MoviePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!slug) {
    return new NextResponse(null, { status: 410 })
  }

  const movie = await prisma.movie.findFirst({
    where: { slug },
    select: { id: true },
  })

  if (!movie) {
    return new NextResponse(null, { status: 410, headers: { 'Cache-Control': 'public, max-age=86400' } })
  }

  return <MoviePageClient />
}
