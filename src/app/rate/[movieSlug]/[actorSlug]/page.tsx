/**
 * Slug-based rate page: /rate/[movieSlug]/[actorSlug]
 * Returns 410 Gone if movie or actor no longer exists (e.g. removed adult content).
 * Fetches movie + actor on the server so the client can render immediately (no loading spinner).
 * Uses Prisma first; on failure (e.g. DB unavailable), falls back to internal APIs (Supabase).
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toIsoDate } from '@/lib/dateUtils'
import RatePageClient from './RatePageClient'
import RatePageFallback from './RatePageFallback'

export const dynamic = 'force-dynamic'

function toIsoDateSafe(value: string | Date | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value.toISOString?.() ?? ''
}

/** Resolve movie + actor via internal APIs (Supabase). Used when Prisma fails. */
async function resolveRatePageDataViaApi(movieSlug: string, actorSlug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const [actorRes, movieRes] = await Promise.all([
    fetch(`${baseUrl}/api/actors/${actorSlug}?minimal=true`, {
      next: { revalidate: 86400 },
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
    }),
    fetch(`${baseUrl}/api/movies/${movieSlug}?minimal=true`, {
      next: { revalidate: 86400 },
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
    }),
  ])
  if (!actorRes.ok || !movieRes.ok) return null
  const [actor, movie] = await Promise.all([actorRes.json(), movieRes.json()])
  if (!actor?.id || !movie?.id) return null
  return {
    initialMovie: {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      director: movie.director ?? 'Unknown',
      slug: movie.slug ?? undefined,
      posterUrl: movie.posterUrl ?? undefined,
      createdAt: toIsoDateSafe(movie.createdAt),
      updatedAt: toIsoDateSafe(movie.updatedAt),
    },
    initialActor: {
      id: actor.id,
      name: actor.name,
      imageUrl: actor.imageUrl ?? undefined,
      slug: actor.slug ?? undefined,
      createdAt: toIsoDateSafe(actor.createdAt),
      updatedAt: toIsoDateSafe(actor.updatedAt),
    },
  }
}

async function resolveRatePageData(movieSlug: string, actorSlug: string) {
  const [movieBySlug, actorBySlug] = await Promise.all([
    prisma.movie.findFirst({
      where: { slug: movieSlug },
      select: { id: true, title: true, year: true, director: true, slug: true, posterUrl: true, createdAt: true, updatedAt: true, isFeaturette: true },
    }),
    prisma.actor.findFirst({
      where: { slug: actorSlug },
      select: { id: true, name: true, imageUrl: true, slug: true, createdAt: true, updatedAt: true },
    }),
  ])

  const movieRow = movieBySlug ?? await prisma.movie.findFirst({
    where: { id: movieSlug },
    select: { id: true, title: true, year: true, director: true, slug: true, posterUrl: true, createdAt: true, updatedAt: true, isFeaturette: true },
  })
  const actorRow = actorBySlug ?? await prisma.actor.findFirst({
    where: { id: actorSlug },
    select: { id: true, name: true, imageUrl: true, slug: true, createdAt: true, updatedAt: true },
  })

  if (!movieRow || !actorRow || movieRow.isFeaturette) return null
  return { movieRow, actorRow }
}

export default async function RatePage({
  params,
}: {
  params: Promise<{ movieSlug: string; actorSlug: string }>
}) {
  const { movieSlug, actorSlug } = await params
  // Temporary: log every ISR render/revalidation to verify rate-page load in Vercel
  if (process.env.NODE_ENV === 'production') {
    console.log('[ISR] Rate page render', `/rate/${movieSlug}/${actorSlug}`)
  }
  if (!movieSlug || !actorSlug) {
    return new NextResponse(null, { status: 410 })
  }

  let resolved: Awaited<ReturnType<typeof resolveRatePageData>> | null = null
  try {
    resolved = await resolveRatePageData(movieSlug, actorSlug)
  } catch (err) {
    console.error(
      `Rate page data failed [${movieSlug}/${actorSlug}]:`,
      err instanceof Error ? err.message : String(err)
    )
    // Fallback: fetch from internal APIs (Supabase) when Prisma fails (e.g. DB unavailable or wrong DATABASE_URL)
    const apiResolved = await resolveRatePageDataViaApi(movieSlug, actorSlug)
    if (apiResolved) {
      return (
        <RatePageClient
          initialMovie={apiResolved.initialMovie}
          initialActor={apiResolved.initialActor}
        />
      )
    }
    return <RatePageFallback />
  }

  if (!resolved) {
    return new NextResponse(null, { status: 410, headers: { 'Cache-Control': 'public, max-age=86400' } })
  }

  const { movieRow, actorRow } = resolved

  const initialMovie = {
    id: movieRow.id,
    title: movieRow.title,
    year: movieRow.year,
    director: movieRow.director ?? 'Unknown',
    slug: movieRow.slug ?? undefined,
    posterUrl: movieRow.posterUrl ?? undefined,
    createdAt: toIsoDate(movieRow.createdAt),
    updatedAt: toIsoDate(movieRow.updatedAt),
  }
  const initialActor = {
    id: actorRow.id,
    name: actorRow.name,
    imageUrl: actorRow.imageUrl ?? undefined,
    slug: actorRow.slug ?? undefined,
    createdAt: toIsoDate(actorRow.createdAt),
    updatedAt: toIsoDate(actorRow.updatedAt),
  }

  // Serialize to plain objects so Client Component never receives Prisma/Date/class instances
  const plainMovie = JSON.parse(JSON.stringify(initialMovie))
  const plainActor = JSON.parse(JSON.stringify(initialActor))

  return <RatePageClient initialMovie={plainMovie} initialActor={plainActor} />
}
