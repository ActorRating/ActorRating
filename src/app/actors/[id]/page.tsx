/**
 * Actor page: /actors/[id]
 * Prefetch actor data on the server via Prisma (no self-HTTP) for crawlable HTML.
 */

export const revalidate = 21600

import { notFound } from 'next/navigation'
import { withIsoDates } from '@/lib/dateUtils'
import {
  ACTOR_CRAWL_SHELL_LIMIT,
  buildActorCrawlShellEntries,
  loadActorPageData,
  type ActorPageData,
} from '@/lib/actor-page-data'
import ActorPageClient from './ActorPageClient'
import ActorPageCrawlShell from '@/components/seo/ActorPageCrawlShell'
import { breadcrumbJsonLd } from '@/lib/seo/breadcrumb-jsonld'

function buildActorJsonLd(data: ActorPageData, baseUrl: string) {
  const base = baseUrl.replace(/\/$/, '')
  const personUrl = `${base}/actors/${data.slug || data.id}`

  const hasPartRaw =
    Array.isArray(data.performances) &&
    data.performances
      .filter((p) => p?.movie?.title)
      .map((p) => ({
        '@type': 'Movie' as const,
        name: p.movie!.title,
        url: `${base}/movies/${p.movie!.slug || p.movie!.id}`,
      }))
  const hasPart = Array.isArray(hasPartRaw) ? hasPartRaw.slice(0, 25) : []

  const ratingCount = data.totalRatingCount
  const aggregateFromApi = data.aggregateWeightedScore
  const hasAggregateRating = ratingCount >= 1 && aggregateFromApi != null
  const avg100 = hasAggregateRating ? aggregateFromApi : null
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
  // Legacy UUID URLs keep the soft-410 client message (HTTP 200) for compatibility.
  if (isUUID) return <ActorPageClient />

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  // Do not catch DB errors into an empty shell — let Next retry / error instead of
  // returning a thin 200 that Google can index.
  const data = await loadActorPageData(id)
  if (!data || !('performances' in data)) {
    notFound()
  }

  const jsonLd = buildActorJsonLd(data, baseUrl)
  const crumbs = breadcrumbJsonLd(baseUrl, [
    { name: 'Home', path: '/' },
    { name: data.name, path: `/actors/${data.slug || data.id}` },
  ])
  const initialActor = withIsoDates({ ...data })
  const initialPerformances = data.performances.map((p) => withIsoDates({ ...p }))
  const crawlEntries = buildActorCrawlShellEntries(data, data.performances, ACTOR_CRAWL_SHELL_LIMIT)

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
      <ActorPageClient
        initialActor={initialActor}
        initialPerformances={initialPerformances}
      />
      <ActorPageCrawlShell
        actorName={data.name}
        intro={data.bio}
        totalRatingCount={data.totalRatingCount}
        entries={crawlEntries}
        cappedFrom={data.performances.length}
      />
    </>
  )
}
