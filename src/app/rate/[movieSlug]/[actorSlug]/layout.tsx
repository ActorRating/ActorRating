import { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { breadcrumbJsonLd } from "@/lib/seo/breadcrumb-jsonld"
import { buildMovieAggregateRating } from "@/lib/seo/aggregate-rating-jsonld"
import { generateRatePageMetadata } from "@/lib/rate-page-metadata"

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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    const [actorResponse, movieResponse] = await Promise.all([
      fetch(`${baseUrl}/api/actors/${actorSlug}`, {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
      }),
      fetch(`${baseUrl}/api/movies/${movieSlug}`, {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
      }),
    ])

    if (!actorResponse.ok || !movieResponse.ok) {
      return null
    }

    const [actor, movie] = await Promise.all([actorResponse.json(), movieResponse.json()])

    return { actor, movie }
  } catch (error) {
    console.error("Error fetching actor/movie data for rate layout JSON-LD:", error)
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { actorSlug, movieSlug } = await params
  return generateRatePageMetadata(movieSlug, actorSlug)
}

export default async function RateLayout({ params, children }: Props) {
  const { actorSlug, movieSlug } = await params
  const data = await fetchActorAndMovie(actorSlug, movieSlug)

  // When actor/movie missing, the page Server Component calls notFound(); layout still wraps children.
  if (!data) {
    return <>{children}</>
  }

  const canonMovieSeg = data.movie.slug ?? data.movie.id
  const canonActorSeg = data.actor.slug ?? data.actor.id

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
      console.error("Rate layout aggregate failed:", err)
    }
  }

  const ratingCount = (ratingAgg?._count as { _all?: number } | undefined)?._all ?? 0
  const avg100 = ratingAgg?._avg ? computeAverage100FromAvgRow(ratingAgg._avg as any) : null
  const avg10 = avg100 != null && avg100 > 0 ? Number((avg100 / 10).toFixed(1)) : null

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://actorrating.com"
  const base = baseUrl.replace(/\/$/, "")
  const pageUrl = `${base}/rate/${canonMovieSeg}/${canonActorSeg}`

  // Person has no aggregateRating. Movie aggregate only when n >= 3 (shared helper).
  const movieAggregate = buildMovieAggregateRating({
    ratingValue10: avg10,
    ratingCount,
  })
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "Person",
      name: data.actor.name,
      url: `${base}/actors/${canonActorSeg}`,
    },
    {
      "@type": "Movie",
      "@id": pageUrl,
      name: data.movie.title,
      url: `${base}/movies/${canonMovieSeg}`,
      ...(data.movie.year && { datePublished: data.movie.year.toString() }),
      actor: {
        "@type": "Person",
        name: data.actor.name,
        url: `${base}/actors/${canonActorSeg}`,
      },
      ...(movieAggregate ? { aggregateRating: movieAggregate } : {}),
    },
  ]

  const breadcrumbs = breadcrumbJsonLd(base, [
    { name: "Home", path: "/" },
    { name: data.movie.title, path: `/movies/${canonMovieSeg}` },
    { name: data.actor.name, path: `/rate/${canonMovieSeg}/${canonActorSeg}` },
  ])

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": graph,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {children}
    </>
  )
}
