import { Metadata } from "next"
import { prisma } from "@/lib/prisma"

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
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
      }),
      fetch(`${baseUrl}/api/movies/${movieSlug}`, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://actorrating.com'
  const canonical = `${baseUrl}/rate/${movieSlug}/${actorSlug}`

  return {
    title,
    description,
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

  let ratingAgg: Awaited<ReturnType<typeof prisma.rating.aggregate>> | null = null
  if (data?.actor?.id && data?.movie?.id) {
    try {
      ratingAgg = await prisma.rating.aggregate({
        where: { actorId: data.actor.id, movieId: data.movie.id },
        _count: { _all: true },
        _avg: {
          emotionalRangeDepth: true,
          characterBelievability: true,
          technicalSkill: true,
          screenPresence: true,
          chemistryInteraction: true,
        },
      })
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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://actorrating.com"
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

