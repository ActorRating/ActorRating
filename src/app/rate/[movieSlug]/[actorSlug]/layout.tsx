import { Metadata } from "next"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"

// Override dynamic inference from root (SessionProvider) so ISR can cache
export const dynamic = 'force-static'
export const revalidate = 86400

type Props = {
  params: Promise<{ movieSlug: string; actorSlug: string }>
  children: React.ReactNode
}

function computeAverage100FromAvgRow(avg: {
  emotionalRangeDepth: number | null
  characterBelievability: number | null
  technicalSkill: number | null
  screenPresence: number | null
  chemistryInteraction: number | null
}) {
  const parts = [
    avg.emotionalRangeDepth,
    avg.characterBelievability,
    avg.technicalSkill,
    avg.screenPresence,
    avg.chemistryInteraction,
  ].filter((v): v is number => typeof v === "number")
  if (parts.length === 0) return null
  return parts.reduce((s, v) => s + v, 0) / parts.length
}

async function fetchActorAndMovie(actorSlug: string, movieSlug: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    const [actorResponse, movieResponse] = await Promise.all([
      fetch(`${baseUrl}/api/actors/${actorSlug}`, {
        next: { revalidate: 86400 },
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit', // ISR: never send cookies — keeps page static
      }),
      fetch(`${baseUrl}/api/movies/${movieSlug}`, {
        next: { revalidate: 86400 },
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit', // ISR: never send cookies — keeps page static
      }),
    ])

    if (!actorResponse.ok || !movieResponse.ok) {
      return null
    }

    const [actor, movie] = await Promise.all([
      actorResponse.json(),
      movieResponse.json()
    ])

    return { actor, movie }
  } catch (error) {
    console.error('Error fetching actor/movie data for metadata:', error)
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { actorSlug, movieSlug } = await params
  const data = await fetchActorAndMovie(actorSlug, movieSlug)

  if (!data) {
    return {
      title: 'Performance Not Found - ActorRating',
      description: 'The requested acting performance could not be found.',
    }
  }

  const { actor, movie } = data
  const yearPart = movie.year ? ` (${movie.year})` : ''
  const title = `Was ${actor.name}'s performance in ${movie.title}${yearPart} great?`
  const description = `How do audiences really rate ${actor.name}'s performance in ${movie.title}? See community scores and decide for yourself.`

  // Performance pages: noindex until ≥1 rating (indexing is a reward for engagement).
  // Use cached count to avoid a second Prisma call in the same request as the layout body (pool contention).
  let ratingCount = 0
  try {
    const getCount = () =>
      prisma.rating.count({ where: { actorId: actor.id, movieId: movie.id } })
    ratingCount = await unstable_cache(getCount, [`rate:count:${actor.id}:${movie.id}`], {
      revalidate: 86400,
    })()
  } catch (err) {
    console.error('Rate layout generateMetadata rating count failed:', err)
    // On pool timeout or DB error, allow index so the page still renders and crawlers aren't blocked
  }
  const robots = ratingCount === 0
    ? { index: false as const, follow: true as const }
    : undefined

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://www.actorrating.com'
  const canonical = `${baseUrl}/rate/${movieSlug}/${actorSlug}`

  return {
    title,
    description,
    robots,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function RateLayout({ params, children }: Props) {
  const { actorSlug, movieSlug } = await params
  const data = await fetchActorAndMovie(actorSlug, movieSlug)

  // When actor/movie not found, 410 is returned by middleware; layout still renders so no Server Component error
  if (!data) {
    return <>{children}</>
  }

  // Aggregate stats for schema — cached 5 min so metadata doesn't burn CPU per crawl
  let ratingAgg: Awaited<ReturnType<typeof prisma.rating.aggregate>> | null = null
  if (data?.actor?.id && data?.movie?.id) {
    try {
      const getRatingAggregate = (actorId: string, movieId: string) =>
        prisma.rating.aggregate({
          where: { actorId, movieId },
          _count: { _all: true },
          _avg: {
            emotionalRangeDepth: true,
            characterBelievability: true,
            technicalSkill: true,
            screenPresence: true,
            chemistryInteraction: true,
          },
        })
      ratingAgg = await unstable_cache(
        () => getRatingAggregate(data.actor.id, data.movie.id),
        [`rate:agg:${data.actor.id}:${data.movie.id}`],
        { revalidate: 86400 }
      )()
    } catch (err) {
      console.error('Rate layout aggregate failed:', err)
    }
  }

  const ratingCount = (ratingAgg?._count as { _all?: number } | undefined)?._all ?? 0
  const avg100 = ratingAgg?._avg ? computeAverage100FromAvgRow(ratingAgg._avg as any) : null
  const avg10 = avg100 != null && avg100 > 0 ? Number((avg100 / 10).toFixed(1)) : null

  // JSON-LD only when ≥1 rating (no schema for 0 ratings — indexing is a reward for engagement).
  // Google rich results: use Movie + aggregateRating ONLY. Do NOT use Review/itemReviewed — that
  // makes Google interpret "you rated a review" and triggers the warning. Person is optional, no rating on Person.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.actorrating.com"
  const pageUrl = `${baseUrl.replace(/\/$/, "")}/rate/${movieSlug}/${actorSlug}`
  const jsonLd =
    data && ratingCount >= 1 && avg10 != null
      ? {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Person",
              name: data.actor.name,
            },
            {
              "@type": "Movie",
              "@id": pageUrl,
              name: data.movie.title,
              ...(data.movie.year && { datePublished: data.movie.year.toString() }),
              actor: {
                "@type": "Person",
                name: data.actor.name,
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: String(avg10),
                ratingCount: String(ratingCount),
                bestRating: 10,
                worstRating: 0,
              },
            },
          ],
        }
      : null

  return (
    <>
      {/* JSON-LD Schema — only for pages with ≥1 rating (eligible for rich snippets) */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  )
}

