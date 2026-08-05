import { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { isRatePageIndexable } from "@/lib/rate-page-seo"
import { breadcrumbJsonLd } from "@/lib/seo/breadcrumb-jsonld"

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
    console.error("Error fetching actor/movie data for metadata:", error)
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { actorSlug, movieSlug } = await params
  const data = await fetchActorAndMovie(actorSlug, movieSlug)

  if (!data) {
    return {
      title: "Performance Not Found",
      description: "The requested acting performance could not be found.",
      robots: { index: false, follow: true },
    }
  }

  const { actor, movie } = data

  let ratingCount = 0
  let seededAggregateScore: number | null = null
  let indexingCohort = 0
  let tier: string | null = null
  try {
    const SYSTEM_USER_ID = "uuid-from-auth-users"
    const [count, systemPerf, anyPerf, movieSeo] = await Promise.all([
      prisma.rating.count({
        where: { actorId: actor.id, movieId: movie.id },
      }),
      prisma.performance.findFirst({
        where: { actorId: actor.id, movieId: movie.id, userId: SYSTEM_USER_ID },
        select: { seededAggregateScore: true, tier: true },
      }),
      prisma.performance.findFirst({
        where: { actorId: actor.id, movieId: movie.id },
        select: { seededAggregateScore: true, tier: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      }),
      prisma.movie.findUnique({
        where: { id: movie.id },
        select: { indexingCohort: true, slug: true, title: true },
      }),
    ])
    const perf = systemPerf ?? anyPerf
    ratingCount = count
    seededAggregateScore =
      typeof perf?.seededAggregateScore === "number" ? perf.seededAggregateScore : null
    tier = perf?.tier ?? null
    indexingCohort = movieSeo?.indexingCohort ?? 0
  } catch (e) {
    console.error("Rate layout SEO metadata query failed:", e)
  }

  const indexable = isRatePageIndexable({
    movieSlug: movie.slug ?? movie.id,
    movieTitle: movie.title,
    indexingCohort,
    seededAggregateScore,
    communityRatingCount: ratingCount,
    tier,
  })

  const robots = indexable ? undefined : ({ index: false as const, follow: true as const })

  const yearPart = movie.year ? ` (${movie.year})` : ""
  const title = `Rate ${actor.name} in ${movie.title}${yearPart}`
  let description = `How do audiences really rate ${actor.name}'s performance in ${movie.title}? See community scores and decide for yourself.`

  try {
    const editorial = await prisma.performanceEditorial.findUnique({
      where: { actorId_movieId: { actorId: actor.id, movieId: movie.id } },
      select: { status: true, overview: true, wordCount: true },
    })
    if (
      editorial &&
      (editorial.status === "PUBLISHED" || editorial.status === "HUMAN_LOCKED") &&
      editorial.wordCount > 0 &&
      editorial.overview.trim()
    ) {
      const firstSentence =
        editorial.overview.split(/(?<=[.!?])\s+/)[0]?.trim() || editorial.overview.trim()
      if (firstSentence.length >= 40) {
        description =
          firstSentence.length > 160 ? `${firstSentence.slice(0, 157).trimEnd()}…` : firstSentence
      }
    }
  } catch {
    // keep default description
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"
  const canonMovieSeg = movie.slug ?? movie.id
  const canonActorSeg = actor.slug ?? actor.id
  const canonical = `${baseUrl}/rate/${canonMovieSeg}/${canonActorSeg}`
  const ogImage = movie.posterUrl || actor.imageUrl || undefined

  return {
    title,
    description,
    robots,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
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

  // Always emit Person + Movie identity. AggregateRating only with real community ratings.
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
      ...(ratingCount >= 1 &&
        avg10 != null && {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: String(avg10),
            ratingCount: String(ratingCount),
            bestRating: 10,
            worstRating: 0,
          },
        }),
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
