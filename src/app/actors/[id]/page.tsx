/**
 * Actor page: /actors/[id]
 * Prefetch actor data on the server for faster first paint.
 */

export const revalidate = 60

import { withIsoDates } from '@/lib/dateUtils'
import ActorPageClient from './ActorPageClient'

function buildActorJsonLd(data: any, baseUrl: string) {
  const base = baseUrl.replace(/\/$/, '')
  const personUrl = `${base}/actors/${data.slug || data.id}`

  const hasPartRaw =
    Array.isArray(data.performances) &&
    data.performances
      .filter((p: any) => p?.movie?.title)
      .map((p: any) => ({
        '@type': 'Movie' as const,
        name: p.movie.title,
        url: `${base}/movies/${p.movie.slug || p.movie.id}`,
      }))
  const hasPart = Array.isArray(hasPartRaw) ? hasPartRaw : []

  const ratings = data.ratings || []
  const ratingCount =
    typeof data.totalRatingCount === 'number' ? data.totalRatingCount : ratings.length
  const aggregateFromApi =
    typeof data.aggregateWeightedScore === 'number' ? data.aggregateWeightedScore : null
  const hasAggregateRating =
    ratingCount >= 1 &&
    (aggregateFromApi != null || ratings.some((r: any) => r.weightedScore != null))
  const avg100 =
    aggregateFromApi != null
      ? aggregateFromApi
      : hasAggregateRating
        ? ratings.reduce((sum: number, r: any) => sum + (Number(r.weightedScore) || 0), 0) / ratingCount
        : null
  const ratingValue10 = avg100 != null && avg100 > 0 ? Number((avg100 / 10).toFixed(1)) : null

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: data.name,
    url: personUrl,
    ...(hasPart.length > 0 && { hasPart }),
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

export default async function ActorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  if (isUUID) return <ActorPageClient />
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/actors/${id}`, {
      // Dev: always fresh so filmography posters match DB; prod: ISR as before.
      ...(process.env.NODE_ENV === 'development'
        ? { cache: 'no-store' as const }
        : { next: { revalidate: 21600 } }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return <ActorPageClient />
    const data = await res.json()
    const jsonLd = buildActorJsonLd(data, baseUrl)
    const initialActor = withIsoDates(data)
    const initialPerformances = Array.isArray(data.performances)
      ? data.performances.map((p: Record<string, unknown>) => withIsoDates(p))
      : []
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ActorPageClient
          initialActor={initialActor}
          initialPerformances={initialPerformances}
        />
      </>
    )
  } catch {
    return <ActorPageClient />
  }
}
