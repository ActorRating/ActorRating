/**
 * Movie page: /movies/[slug]
 * Prefetch movie data on the server for faster first paint.
 */

export const revalidate = 60

import { notFound } from 'next/navigation'
import { withIsoDates } from '@/lib/dateUtils'
import { prisma } from '@/lib/prisma'
import { isFeaturetteMovie, matchesFeaturetteTitle } from '@/lib/non-rateable'
import MoviePageClient from './MoviePageClient'
import { breadcrumbJsonLd } from '@/lib/seo/breadcrumb-jsonld'
import { buildMovieJsonLd } from '@/lib/seo/movie-jsonld'

export default async function MoviePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const movieMeta = await prisma.movie.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: { id: true, title: true, isFeaturette: true },
  })
  if (movieMeta && isFeaturetteMovie(movieMeta)) {
    if (!movieMeta.isFeaturette && matchesFeaturetteTitle(movieMeta.title)) {
      void prisma.movie
        .update({ where: { id: movieMeta.id }, data: { isFeaturette: true } })
        .catch(() => {})
    }
    notFound()
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
  if (isUUID) return <MoviePageClient />
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/movies/${slug}`, {
      next: { revalidate: 21600 },
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.status === 410) notFound()
    if (!res.ok) return <MoviePageClient />
    const data = await res.json()
    const jsonLd = buildMovieJsonLd(data, baseUrl)
    const crumbs = breadcrumbJsonLd(baseUrl, [
      { name: 'Home', path: '/' },
      { name: data.title, path: `/movies/${data.slug || data.id}` },
    ])
    const initialMovie = withIsoDates(data)
    const initialPerformances = Array.isArray(data.performances)
      ? data.performances.map((p: Record<string, unknown>) => withIsoDates(p))
      : []
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
        />
        <MoviePageClient
          initialMovie={initialMovie}
          initialPerformances={initialPerformances}
        />
      </>
    )
  } catch {
    return <MoviePageClient />
  }
}
