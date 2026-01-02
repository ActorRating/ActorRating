import { Metadata } from "next"
import { notFound } from "next/navigation"

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
    description: `Rate ${actor.name}'s acting performance in ${fullMovieTitle} using our 0-100 scoring system based on five Oscar-inspired criteria. Join the community in evaluating this performance.`,
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

export default function RateLayout({ children }: Props) {
  return <>{children}</>
}

