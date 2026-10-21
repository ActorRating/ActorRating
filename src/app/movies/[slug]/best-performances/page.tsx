/**
 * Best-performances hub: /movies/[slug]/best-performances
 * Prisma SSR — no self-fetch. Ranked LEAD/SUPPORTING + full MINOR cast.
 */

export const revalidate = 3600

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HomeLayout } from "@/components/layout"
import { OdysseyHubTracker } from "@/components/analytics/OdysseyHubTracker"
import { isHubEnabledSlug } from "@/lib/movie-best-performances/hub-allowlist"
import { loadMovieBestPerformancesHub } from "@/lib/movie-best-performances/load-hub"
import { RANKING_PLAIN_SENTENCE } from "@/lib/movie-best-performances/ranking"
import { prisma } from "@/lib/prisma"
import { breadcrumbJsonLd } from "@/lib/seo/breadcrumb-jsonld"

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"

/** Live rate-UI criteria labels (hub-only; do not change labels elsewhere). */
const HUB_CRITERIA_LABELS = [
  "Emotional Impact",
  "Character Depth",
  "Technical Skill",
  "Screen Presence",
  "Originality",
] as const

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (!isHubEnabledSlug(slug)) notFound()

  const movie = await prisma.movie.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: { title: true, year: true, slug: true, posterUrl: true, isFeaturette: true },
  })
  if (!movie || movie.isFeaturette) {
    return { title: "Not Found", robots: { index: false, follow: true } }
  }

  const yearPart = movie.year ? ` (${movie.year})` : ""
  const title = `Who Gave the Best Performance in ${movie.title}${yearPart}?`
  const description = `Community rankings for every lead and supporting role in ${movie.title}${yearPart}. See scores and rate each performance on ActorRating.`
  const pathSlug = movie.slug ?? slug
  const canonical = `${BASE_URL}/movies/${pathSlug}/best-performances`

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      ...(movie.posterUrl ? { images: [{ url: movie.posterUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(movie.posterUrl ? { images: [movie.posterUrl] } : {}),
    },
  }
}

function scoreLabel(avg10: number | null, count: number): string {
  if (count <= 0 || avg10 == null) return "Be the first to rate"
  return `${avg10.toFixed(1)}/10`
}

export default async function BestPerformancesHubPage({ params }: Props) {
  const { slug } = await params
  if (!isHubEnabledSlug(slug)) notFound()

  // Do not catch DB errors into an empty 200 — let Next retry / error.
  const hub = await loadMovieBestPerformancesHub(prisma, slug)
  if (!hub) notFound()

  const movieSlug = hub.movie.slug ?? slug
  const filmPath = `/movies/${movieSlug}`
  const hubPath = `${filmPath}/best-performances`
  const yearPart = hub.movie.year ? ` (${hub.movie.year})` : ""

  const crumbs = breadcrumbJsonLd(BASE_URL, [
    { name: "Home", path: "/" },
    { name: hub.movie.title, path: filmPath },
    { name: "Best performances", path: hubPath },
  ])

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Best performances in ${hub.movie.title}${yearPart}`,
    description: `Community ranking of lead and supporting performances in ${hub.movie.title}.`,
    url: `${BASE_URL}${hubPath}`,
    numberOfItems: hub.rankedLeadsAndSupporting.length,
    itemListElement: hub.rankedLeadsAndSupporting.map((row, index) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name: row.character
        ? `${row.actorName} as ${row.character}`
        : `${row.actorName} in ${hub.movie.title}`,
      url: `${BASE_URL}/rate/${movieSlug}/${row.actorSlug ?? row.actorId}`,
    })),
  }

  const ratingWord = hub.totalSignedInRatings === 1 ? "rating" : "ratings"

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <OdysseyHubTracker movieSlug={movieSlug} movieTitle={hub.movie.title} />
      <HomeLayout>
        <main className="min-h-screen bg-black text-white">
          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Community ranking
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Who gave the best performance in {hub.movie.title}
              {yearPart}?
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              This ranking is based on ActorRating community scores from signed-in
              raters — currently{" "}
              <span className="text-zinc-200">
                {hub.totalSignedInRatings} {ratingWord}
              </span>{" "}
              across the cast.{" "}
              <Link href={filmPath} className="text-[#FFE27A] underline-offset-2 hover:underline">
                Film page
              </Link>
              .
            </p>
            <p className="mt-3 max-w-2xl text-sm text-zinc-500">{RANKING_PLAIN_SENTENCE}</p>

            <section className="mt-8" aria-labelledby="criteria-heading">
              <h2 id="criteria-heading" className="text-sm font-semibold text-zinc-300">
                What you rate
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
                {HUB_CRITERIA_LABELS.map((label) => (
                  <li
                    key={label}
                    className="rounded border border-white/10 px-2.5 py-1 text-zinc-300"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-10" aria-labelledby="ranked-heading">
              <h2 id="ranked-heading" className="text-lg font-semibold text-white">
                Lead &amp; supporting
              </h2>
              <ol className="mt-4 space-y-3">
                {hub.rankedLeadsAndSupporting.map((row, index) => {
                  const rateHref = `/rate/${movieSlug}/${row.actorSlug ?? row.actorId}`
                  const actorHref = `/actors/${row.actorSlug ?? row.actorId}`
                  const label = scoreLabel(row.avg10, row.count)
                  return (
                    <li
                      key={row.performanceId}
                      className="border-b border-white/10 pb-3 last:border-0"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <div className="min-w-0">
                          <span className="mr-2 tabular-nums text-zinc-500">{index + 1}.</span>
                          <Link
                            href={actorHref}
                            className="font-medium text-zinc-100 underline-offset-2 hover:underline"
                          >
                            {row.actorName}
                          </Link>
                          {row.character ? (
                            <span className="text-zinc-500"> as {row.character}</span>
                          ) : null}
                          <span className="mt-0.5 block text-xs uppercase tracking-wide text-zinc-600">
                            {row.tier}
                          </span>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="tabular-nums text-sm font-semibold text-[#FFE27A]">
                            {label}
                          </div>
                          {row.count > 0 ? (
                            <div className="text-xs text-zinc-500">
                              {row.count} {row.count === 1 ? "rating" : "ratings"}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-2">
                        <a
                          href={rateHref}
                          data-hub-rate-performance-id={row.performanceId}
                          className="inline-flex text-sm font-semibold text-[#FFE27A] underline-offset-2 hover:underline"
                        >
                          Rate this performance
                        </a>
                      </p>
                    </li>
                  )
                })}
              </ol>
            </section>

            {hub.fullCastMinors.length > 0 ? (
              <section className="mt-12" aria-labelledby="full-cast-heading">
                <h2 id="full-cast-heading" className="text-lg font-semibold text-white">
                  Full cast
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Additional cast credits — rate any of them.
                </p>
                <ul className="mt-4 space-y-2">
                  {hub.fullCastMinors.map((row) => {
                    const rateHref = `/rate/${movieSlug}/${row.actorSlug ?? row.actorId}`
                    const actorHref = `/actors/${row.actorSlug ?? row.actorId}`
                    const hasScore = row.count > 0 && row.avg10 != null
                    return (
                      <li
                        key={row.performanceId}
                        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-white/5 py-2 text-sm last:border-0"
                      >
                        <div className="min-w-0">
                          <Link
                            href={actorHref}
                            className="text-zinc-200 underline-offset-2 hover:underline"
                          >
                            {row.actorName}
                          </Link>
                          {row.character ? (
                            <span className="text-zinc-500"> as {row.character}</span>
                          ) : null}
                          {hasScore ? (
                            <span className="ml-2 tabular-nums text-zinc-500">
                              {row.avg10!.toFixed(1)}/10 · {row.count}{" "}
                              {row.count === 1 ? "rating" : "ratings"}
                            </span>
                          ) : null}
                        </div>
                        <a
                          href={rateHref}
                          data-hub-rate-performance-id={row.performanceId}
                          className="shrink-0 font-semibold text-[#FFE27A] underline-offset-2 hover:underline"
                        >
                          Rate
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}
          </div>
        </main>
      </HomeLayout>
    </>
  )
}
