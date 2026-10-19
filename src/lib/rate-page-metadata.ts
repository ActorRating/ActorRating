import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { isRatePageIndexable } from "@/lib/rate-page-seo"
import { pickCanonicalPerformanceSeoMeta } from "@/lib/rate-page-canonical-perf"

const movieSelect = {
  id: true,
  title: true,
  year: true,
  slug: true,
  posterUrl: true,
  indexingCohort: true,
} as const

const actorSelect = {
  id: true,
  name: true,
  slug: true,
  imageUrl: true,
} as const

export type RatePageMetadataMovie = {
  id: string
  title: string
  year: number
  slug: string | null
  posterUrl: string | null
  indexingCohort: number
}

export type RatePageMetadataActor = {
  id: string
  name: string
  slug: string | null
  imageUrl: string | null
}

export type RatePageMetadataSource = {
  actor: RatePageMetadataActor
  movie: RatePageMetadataMovie
  communityRatingCount: number
  tier: string | null
  seededAggregateScore: number | null
  editorialOverview: string | null
  editorialWordCount: number
  editorialPublished: boolean
}

export function ratePageNotFoundMetadata(): Metadata {
  return {
    title: "Performance Not Found",
    description: "The requested acting performance could not be found.",
    robots: { index: false, follow: true },
  }
}

function editorialDescription(source: RatePageMetadataSource): string | null {
  if (!source.editorialPublished || source.editorialWordCount <= 0) return null
  const overview = source.editorialOverview?.trim()
  if (!overview) return null
  const firstSentence = overview.split(/(?<=[.!?])\s+/)[0]?.trim() || overview
  if (firstSentence.length < 40) return null
  return firstSentence.length > 160 ? `${firstSentence.slice(0, 157).trimEnd()}…` : firstSentence
}

/** Title, canonical, and robots for a pair Prisma already resolved. */
export function buildRatePageMetadata(source: RatePageMetadataSource): Metadata {
  const indexable = isRatePageIndexable({
    movieSlug: source.movie.slug ?? source.movie.id,
    movieTitle: source.movie.title,
    indexingCohort: source.movie.indexingCohort,
    seededAggregateScore: source.seededAggregateScore,
    communityRatingCount: source.communityRatingCount,
    tier: source.tier,
  })
  const robots = indexable ? undefined : ({ index: false as const, follow: true as const })

  const yearPart = source.movie.year ? ` (${source.movie.year})` : ""
  const title = `Rate ${source.actor.name} in ${source.movie.title}${yearPart}`
  const description =
    editorialDescription(source) ??
    `How do audiences really rate ${source.actor.name}'s performance in ${source.movie.title}? See community scores and decide for yourself.`

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"
  const canonMovieSeg = source.movie.slug ?? source.movie.id
  const canonActorSeg = source.actor.slug ?? source.actor.id
  const canonical = `${baseUrl}/rate/${canonMovieSeg}/${canonActorSeg}`
  const ogImage = source.movie.posterUrl || source.actor.imageUrl || undefined

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

async function findMovie(segment: string) {
  const bySlug = await prisma.movie.findFirst({ where: { slug: segment }, select: movieSelect })
  if (bySlug) return bySlug
  return prisma.movie.findFirst({ where: { id: segment }, select: movieSelect })
}

async function findActor(segment: string) {
  const bySlug = await prisma.actor.findFirst({ where: { slug: segment }, select: actorSelect })
  if (bySlug) return bySlug
  return prisma.actor.findFirst({ where: { id: segment }, select: actorSelect })
}

/** Metadata for a rate URL. Prisma only — a failed public API request must not noindex a real page. */
export async function generateRatePageMetadata(
  movieSlug: string,
  actorSlug: string,
): Promise<Metadata> {
  try {
    const source = await loadRatePageForMetadata(movieSlug, actorSlug)
    if (!source) return ratePageNotFoundMetadata()
    return buildRatePageMetadata(source)
  } catch (error) {
    console.error("Rate layout SEO metadata query failed:", error)
    return ratePageNotFoundMetadata()
  }
}

/**
 * Resolve a rate URL from Prisma. Returns null when the actor or movie does not exist.
 * Does not call the public actor/movie APIs.
 */
export async function loadRatePageForMetadata(
  movieSlug: string,
  actorSlug: string,
): Promise<RatePageMetadataSource | null> {
  const [movie, actor] = await Promise.all([findMovie(movieSlug), findActor(actorSlug)])
  if (!movie?.title || !actor?.name) return null

  const [communityRatingCount, performances, editorial] = await Promise.all([
    prisma.rating.count({ where: { actorId: actor.id, movieId: movie.id } }),
    prisma.performance.findMany({
      where: { actorId: actor.id, movieId: movie.id },
      select: {
        seededAggregateScore: true,
        tier: true,
        userId: true,
        order: true,
        createdAt: true,
        character: true,
      },
    }),
    prisma.performanceEditorial.findUnique({
      where: { actorId_movieId: { actorId: actor.id, movieId: movie.id } },
      select: { status: true, overview: true, wordCount: true },
    }),
  ])

  const seo = pickCanonicalPerformanceSeoMeta(performances)
  const editorialPublished =
    editorial?.status === "PUBLISHED" || editorial?.status === "HUMAN_LOCKED"

  return {
    actor,
    movie,
    communityRatingCount,
    tier: seo.tier,
    seededAggregateScore: seo.seededAggregateScore,
    editorialOverview: editorial?.overview ?? null,
    editorialWordCount: editorial?.wordCount ?? 0,
    editorialPublished,
  }
}
