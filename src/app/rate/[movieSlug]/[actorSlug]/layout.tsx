import { Metadata } from "next"

type Props = {
  params: Promise<{ movieSlug: string; actorSlug: string }>
  children: React.ReactNode
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
  const fullMovieTitle = movie.year ? `${movie.title} (${movie.year})` : movie.title

  return {
    title: `Rate ${actor.name}'s Performance in ${fullMovieTitle} - ActorRating`,
    description: `Rate ${actor.name}'s acting performance in ${fullMovieTitle} using our 0-10 performance rating system based on five Oscar-inspired criteria. Join the community in evaluating this performance.`,
    openGraph: {
      title: `Rate ${actor.name} in ${fullMovieTitle}`,
      description: `Rate ${actor.name}'s performance using ActorRating's comprehensive scoring system.`,
      type: 'website',
      url: `https://www.actorrating.com/rate/${movieSlug}/${actorSlug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `Rate ${actor.name} in ${fullMovieTitle}`,
      description: `Rate ${actor.name}'s performance using ActorRating's comprehensive scoring system.`,
    },
  }
}

export default async function RateLayout({ params, children }: Props) {
  const { actorSlug, movieSlug } = await params
  const data = await fetchActorAndMovie(actorSlug, movieSlug)

  // JSON-LD - Always rendered on SSR for crawlers (not conditional on auth)
  const jsonLd = data ? {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Rate ${data.actor.name}'s Performance in ${data.movie.title}`,
    description: `Rate ${data.actor.name}'s acting performance in ${data.movie.title} using ActorRating's 0-10 performance rating system based on five Oscar-inspired criteria.`,
    mainEntity: {
      "@type": "Review",
      itemReviewed: {
        "@type": "PerformanceRole",
        actor: {
          "@type": "Person",
          name: data.actor.name
        },
        workFeatured: {
          "@type": "Movie",
          name: data.movie.title,
          ...(data.movie.year && { dateCreated: data.movie.year.toString() })
        }
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: "0-10",
        worstRating: 0,
        bestRating: 10
      }
    },
    isPartOf: {
      "@type": "WebSite",
      name: "ActorRating",
      url: "https://www.actorrating.com"
    }
  } : null

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

