/**
 * Slug-based rate page: /rate/[movieSlug]/[actorSlug]
 * Returns 410 Gone if movie or actor no longer exists (e.g. removed adult content).
 * Fetches movie + actor on the server so the client can render immediately (no loading spinner).
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import RatePageClient from './RatePageClient'

export const dynamic = 'force-static' // override dynamic inference from root (SessionProvider)
export const revalidate = 3600 // 1 hour ISR

export default async function RatePage({
  params,
}: {
  params: Promise<{ movieSlug: string; actorSlug: string }>
}) {
  const { movieSlug, actorSlug } = await params
  if (!movieSlug || !actorSlug) {
    return new NextResponse(null, { status: 410 })
  }

  // Resolve by slug first, then by id (so /rate/{id}/{id} works when slug is null)
  const [movieBySlug, actorBySlug] = await Promise.all([
    prisma.movie.findFirst({
      where: { slug: movieSlug },
      select: { id: true, title: true, year: true, director: true, slug: true, createdAt: true, updatedAt: true },
    }),
    prisma.actor.findFirst({
      where: { slug: actorSlug },
      select: { id: true, name: true, imageUrl: true, slug: true, createdAt: true, updatedAt: true },
    }),
  ])

  const movieRow = movieBySlug ?? await prisma.movie.findFirst({
    where: { id: movieSlug },
    select: { id: true, title: true, year: true, director: true, slug: true, createdAt: true, updatedAt: true },
  })
  const actorRow = actorBySlug ?? await prisma.actor.findFirst({
    where: { id: actorSlug },
    select: { id: true, name: true, imageUrl: true, slug: true, createdAt: true, updatedAt: true },
  })

  if (!movieRow || !actorRow) {
    return new NextResponse(null, { status: 410, headers: { 'Cache-Control': 'public, max-age=86400' } })
  }

  const initialMovie = {
    id: movieRow.id,
    title: movieRow.title,
    year: movieRow.year,
    director: movieRow.director ?? 'Unknown',
    slug: movieRow.slug ?? undefined,
    createdAt: movieRow.createdAt.toISOString(),
    updatedAt: movieRow.updatedAt.toISOString(),
  }
  const initialActor = {
    id: actorRow.id,
    name: actorRow.name,
    imageUrl: actorRow.imageUrl ?? undefined,
    slug: actorRow.slug ?? undefined,
    createdAt: actorRow.createdAt.toISOString(),
    updatedAt: actorRow.updatedAt.toISOString(),
  }

  return <RatePageClient initialMovie={initialMovie} initialActor={initialActor} />
}
