/**
 * Slug-based rate page: /rate/[movieSlug]/[actorSlug]
 * Invalid combinations → 404. ID-based URLs 301 to canonical slug path when available.
 * Uses Prisma first; on failure falls back to internal HTTP APIs (same-origin).
 */

import { permanentRedirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { toIsoDate } from '@/lib/dateUtils'
import { isPublicSeoBlockedMovie } from '@/lib/public-movie-seo-block'
import {
  isFeaturetteMovie,
  isSelfOrArchiveCredit,
  matchesFeaturetteTitle,
} from '@/lib/non-rateable'
import { isMovieComingSoon } from '@/lib/movie-release'
import { getRatePageInternalLinks } from '@/lib/rate-page-internal-links'
import RatePageInternalLinksSection from '@/components/seo/RatePageInternalLinksSection'
import PerformanceEditorialSection from '@/components/seo/PerformanceEditorialSection'
import RatePageClient from './RatePageClient'

function toIsoDateSafe(value: string | Date | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value.toISOString?.() ?? ''
}

/** Resolve movie + actor via internal APIs. Used when Prisma fails. */
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
      select: {
        id: true,
        title: true,
        year: true,
        director: true,
        slug: true,
        posterUrl: true,
        createdAt: true,
        updatedAt: true,
        isFeaturette: true,
        genre: true,
        overview: true,
        releaseDate: true,
      },
    }),
    prisma.actor.findFirst({
      where: { slug: actorSlug },
      select: { id: true, name: true, imageUrl: true, slug: true, createdAt: true, updatedAt: true },
    }),
  ])

  const movieRow =
    movieBySlug ??
    (await prisma.movie.findFirst({
      where: { id: movieSlug },
      select: {
        id: true,
        title: true,
        year: true,
        director: true,
        slug: true,
        posterUrl: true,
        createdAt: true,
        updatedAt: true,
        isFeaturette: true,
        genre: true,
        overview: true,
        releaseDate: true,
      },
    }))
  const actorRow =
    actorBySlug ??
    (await prisma.actor.findFirst({
      where: { id: actorSlug },
      select: { id: true, name: true, imageUrl: true, slug: true, createdAt: true, updatedAt: true },
    }))

  if (!movieRow || !actorRow || isFeaturetteMovie(movieRow)) {
    if (movieRow && !movieRow.isFeaturette && matchesFeaturetteTitle(movieRow.title)) {
      void prisma.movie
        .update({ where: { id: movieRow.id }, data: { isFeaturette: true } })
        .catch(() => {})
    }
    return null
  }
  if (
    isPublicSeoBlockedMovie(
      movieRow.slug ?? movieRow.id,
      movieRow.title,
      movieRow.genre ?? null,
      movieRow.overview ?? null,
    )
  ) {
    return null
  }

  // Coming-soon titles stay browsable on hubs but cannot be rated yet.
  if (isMovieComingSoon(movieRow)) {
    return null
  }

  const performance = await prisma.performance.findFirst({
    where: { actorId: actorRow.id, movieId: movieRow.id },
    select: { seededAggregateScore: true, character: true, comment: true },
    orderBy: { createdAt: 'asc' },
  })

  if (isSelfOrArchiveCredit(performance?.character)) {
    return null
  }

  return {
    movieRow,
    actorRow,
    seededAggregateScore:
      typeof performance?.seededAggregateScore === 'number'
        ? performance.seededAggregateScore
        : null,
  }
}

export default async function RatePage({
  params,
}: {
  params: Promise<{ movieSlug: string; actorSlug: string }>
}) {
  const { movieSlug, actorSlug } = await params
  if (process.env.NODE_ENV === 'production') {
    console.log('[ISR] Rate page render', `/rate/${movieSlug}/${actorSlug}`)
  }
  if (!movieSlug || !actorSlug) {
    notFound()
  }

  let resolved: Awaited<ReturnType<typeof resolveRatePageData>> | null = null
  try {
    resolved = await resolveRatePageData(movieSlug, actorSlug)
  } catch (err) {
    console.error(
      `Rate page data failed [${movieSlug}/${actorSlug}]:`,
      err instanceof Error ? err.message : String(err),
    )
    const apiResolved = await resolveRatePageDataViaApi(movieSlug, actorSlug)
    if (apiResolved) {
      return (
        <RatePageClient
          initialMovie={apiResolved.initialMovie}
          initialActor={apiResolved.initialActor}
        />
      )
    }
    notFound()
  }

  if (!resolved) {
    notFound()
  }

  const { movieRow, actorRow, seededAggregateScore } = resolved

  const canonicalMovieSeg = movieRow.slug ?? movieRow.id
  const canonicalActorSeg = actorRow.slug ?? actorRow.id
  if (movieSlug !== canonicalMovieSeg || actorSlug !== canonicalActorSeg) {
    permanentRedirect(`/rate/${canonicalMovieSeg}/${canonicalActorSeg}`)
  }

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

  const plainMovie = JSON.parse(JSON.stringify(initialMovie))
  const plainActor = JSON.parse(JSON.stringify(initialActor))

  let internalLinks = null
  let editorial = null as null | {
    overview: string
    scoreAnalysis: string
    communityTake: string
    notableMoments: string
  }
  try {
    internalLinks = await getRatePageInternalLinks(prisma, {
      actorId: actorRow.id,
      movieId: movieRow.id,
      actorName: actorRow.name,
      actorSlug: actorRow.slug,
      movieTitle: movieRow.title,
      movieSlug: movieRow.slug,
      movieYear: movieRow.year,
      director: movieRow.director,
      genre: movieRow.genre,
    })
  } catch (err) {
    console.error('Rate page internal links failed:', err)
  }

  try {
    const row = await prisma.performanceEditorial.findUnique({
      where: {
        actorId_movieId: { actorId: actorRow.id, movieId: movieRow.id },
      },
      select: {
        status: true,
        overview: true,
        scoreAnalysis: true,
        communityTake: true,
        notableMoments: true,
        wordCount: true,
      },
    })
    if (
      row &&
      (row.status === 'PUBLISHED' || row.status === 'HUMAN_LOCKED') &&
      row.wordCount > 0 &&
      row.overview.trim()
    ) {
      editorial = {
        overview: row.overview,
        scoreAnalysis: row.scoreAnalysis,
        communityTake: row.communityTake,
        notableMoments: row.notableMoments,
      }
    }
  } catch (err) {
    console.error('Rate page editorial load failed:', err)
  }

  return (
    <>
      <RatePageClient
        initialMovie={plainMovie}
        initialActor={plainActor}
        initialSeededAggregateScore={seededAggregateScore}
      />
      {editorial ? (
        <PerformanceEditorialSection
          actorName={actorRow.name}
          movieTitle={movieRow.title}
          overview={editorial.overview}
          scoreAnalysis={editorial.scoreAnalysis}
          communityTake={editorial.communityTake}
          notableMoments={editorial.notableMoments}
        />
      ) : null}
      {internalLinks ? <RatePageInternalLinksSection links={internalLinks} /> : null}
    </>
  )
}
