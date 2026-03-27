/**
 * Movie page: /movies/[slug]
 * Prefetch movie data on the server for faster first paint.
 */

import { withIsoDates } from '@/lib/dateUtils'
import MoviePageClient from './MoviePageClient'

export const revalidate = 21600

function buildMovieJsonLd(data: any, baseUrl: string) {
  const base = baseUrl.replace(/\/$/, '')
  const movieUrl = `${base}/movies/${data.slug || data.id}`

  const actor =
    Array.isArray(data.performances) &&
    data.performances
      .filter((p: any) => p?.actor?.name)
      .map((p: any) => ({
        '@type': 'Person' as const,
        name: p.actor.name,
        url: `${base}/actors/${p.actor.slug || p.actor.id}`,
      }))

  const ratings = data.ratings || []
  const ratingCount = ratings.length
  const hasScores = ratings.some((r: any) => r.weightedScore != null)
  const avg100 =
    hasScores && ratingCount >= 1
      ? ratings.reduce((sum: number, r: any) => sum + (Number(r.weightedScore) || 0), 0) / ratingCount
      : null
  const ratingValue10 = avg100 != null && avg100 > 0 ? Number((avg100 / 10).toFixed(1)) : null

  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: data.title,
    url: movieUrl,
    ...(data.year && { datePublished: String(data.year) }),
    ...(Array.isArray(actor) && actor.length > 0 && { actor }),
    ...(ratingCount >= 1 &&
      ratingValue10 != null && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: String(ratingValue10),
          ratingCount: String(ratingCount),
          bestRating: 10,
          worstRating: 0,
        },
      }),
  }
}

export default async function MoviePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
  if (isUUID) return <MoviePageClient />
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/movies/${slug}`, {
      next: { revalidate: 21600 },
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return <MoviePageClient />
    const data = await res.json()
    const jsonLd = buildMovieJsonLd(data, baseUrl)
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
