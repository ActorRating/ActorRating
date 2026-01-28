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
        headers: { 'Content-Type': 'application/json' }
      }),
      fetch(`${baseUrl}/api/movies/${movieSlug}`, { 
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
      })
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
  const title = `${actor.name} in ${movie.title} — Performance Rating${yearPart}`

  return {
    title,
    description: `Critics and viewers rated ${actor.name}’s performance in ${movie.title}. Some call it iconic. Others disagree. See the score.`,
    openGraph: {
      title,
      description: `See the full performance breakdown and community rating. Rate it yourself in seconds.`,
      type: 'website',
      url: `https://www.actorrating.com/rate/${movieSlug}/${actorSlug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: `See the full performance breakdown and community rating. Rate it yourself in seconds.`,
    },
  }
}

export default async function RateLayout({ params, children }: Props) {
  const { actorSlug, movieSlug } = await params
  const data = await fetchActorAndMovie(actorSlug, movieSlug)

  // Aggregate stats for schema (minimal, no overkill)
  const ratingAgg = data?.actor?.id && data?.movie?.id
    ? await prisma.rating.aggregate({
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
    : null

  const ratingCount = ratingAgg?._count?._all ?? 0
  const avg100 = ratingAgg?._avg ? computeAverage100FromAvgRow(ratingAgg._avg as any) : null
  const avg10 = avg100 != null && avg100 > 0 ? Number((avg100 / 10).toFixed(1)) : null

  // JSON-LD - Always rendered on SSR for crawlers (not conditional on auth)
  const jsonLd = data
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Person",
            name: data.actor.name,
          },
          {
            "@type": "Movie",
            name: data.movie.title,
            ...(data.movie.year && { dateCreated: data.movie.year.toString() }),
          },
          {
            "@type": "WebPage",
            name: `Rate ${data.actor.name}'s Performance in ${data.movie.title}`,
            description: `Rate ${data.actor.name}'s acting performance in ${data.movie.title} using ActorRating's 0-10 performance rating system based on five Oscar-inspired criteria.`,
            mainEntity: {
              "@type": "Review",
              itemReviewed: {
                "@type": "PerformanceRole",
                actor: { "@type": "Person", name: data.actor.name },
                workFeatured: {
                  "@type": "Movie",
                  name: data.movie.title,
                  ...(data.movie.year && { dateCreated: data.movie.year.toString() }),
                },
              },
              ...(ratingCount > 0 && avg10 != null
                ? {
                    aggregateRating: {
                      "@type": "AggregateRating",
                      ratingValue: avg10,
                      ratingCount,
                      bestRating: 10,
                      worstRating: 0,
                    },
                  }
                : {}),
            },
            isPartOf: {
              "@type": "WebSite",
              name: "ActorRating",
              url: "https://www.actorrating.com",
            },
          },
        ],
      }
    : null

  return (
    <>
      {/* JSON-LD Schema - Server-side only, always rendered for crawlers */}
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

