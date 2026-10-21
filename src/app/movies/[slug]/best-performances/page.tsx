/**
 * Best-performances hub: /movies/[slug]/best-performances
 * Prisma SSR — visuals aligned with landing hero washes + movie-page cards.
 */

export const revalidate = 3600

import type { CSSProperties } from "react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { HomeLayout } from "@/components/layout"
import { OdysseyHubTracker } from "@/components/analytics/OdysseyHubTracker"
import { FIXED_LANDING_HERO } from "@/lib/home-featured-performance"
import { isHubEnabledSlug } from "@/lib/movie-best-performances/hub-allowlist"
import { loadMovieBestPerformancesHub } from "@/lib/movie-best-performances/load-hub"
import { RANKING_PLAIN_SENTENCE } from "@/lib/movie-best-performances/ranking"
import { prisma } from "@/lib/prisma"
import { breadcrumbJsonLd } from "@/lib/seo/breadcrumb-jsonld"
import { upgradeActorImageRes } from "@/lib/tmdb"

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"

const GOLD_CTA =
  "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)"

const DISPLAY: CSSProperties = {
  fontFamily:
    'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
}

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
  return avg10.toFixed(1)
}

function upgradePosterThumb(url?: string | null): string | null {
  if (!url) return null
  return url
    .replace(/\/t\/p\/w\d+\//, "/t/p/w500/")
    .replace(/\/t\/p\/original\//, "/t/p/w500/")
}

export default async function BestPerformancesHubPage({ params }: Props) {
  const { slug } = await params
  if (!isHubEnabledSlug(slug)) notFound()

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
  const heroStill =
    movieSlug === "the-odyssey-2026"
      ? FIXED_LANDING_HERO.backdropUrl
      : upgradePosterThumb(hub.movie.posterUrl)
  const posterThumb = upgradePosterThumb(hub.movie.posterUrl)

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
          {/* ── Mobile / tablet: still on top (landing stacked pattern) ── */}
          <section className="lg:hidden bg-black">
            {heroStill ? (
              <div className="relative w-full aspect-[16/10] max-h-[48svh] overflow-hidden">
                <Image
                  src={heroStill}
                  alt=""
                  fill
                  priority
                  quality={90}
                  className="object-cover object-center"
                  sizes="100vw"
                />
                <div
                  className="hero-backdrop-wash hero-backdrop-wash--stacked absolute inset-0 pointer-events-none"
                  aria-hidden
                />
              </div>
            ) : null}

            <div
              className="px-4 sm:px-6 pt-6 pb-10"
              style={{
                paddingTop: heroStill
                  ? undefined
                  : "max(5.5rem, calc(5rem + env(safe-area-inset-top, 0px)))",
              }}
            >
              <Link
                href={filmPath}
                className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
                aria-label={`Back to ${hub.movie.title}`}
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>

              <div className="flex gap-5">
                {posterThumb ? (
                  <div className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-md ring-1 ring-white/[0.08] sm:w-24">
                    <Image
                      src={posterThumb}
                      alt=""
                      fill
                      priority
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p
                    className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em]"
                    style={{ color: "#FFD700" }}
                  >
                    Community ranking
                  </p>
                  <h1
                    className="text-[1.85rem] font-bold leading-[1.15] tracking-tight text-white sm:text-4xl"
                    style={DISPLAY}
                  >
                    Who gave the best performance in {hub.movie.title}
                    {yearPart}?
                  </h1>
                </div>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-zinc-400 sm:text-base">
                Ranked by ActorRating community scores from signed-in raters —{" "}
                <span className="font-semibold text-zinc-200">
                  {hub.totalSignedInRatings} {ratingWord}
                </span>{" "}
                so far.{" "}
                <Link
                  href={filmPath}
                  className="text-[#FFD700] underline-offset-2 hover:underline"
                >
                  Film page
                </Link>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                {RANKING_PLAIN_SENTENCE}
              </p>
            </div>
          </section>

          {/* ── Desktop: full-bleed still with landing washes ── */}
          <section className="relative hidden lg:block bg-black overflow-hidden">
            <div className="relative h-[min(62svh,640px)] w-full min-h-[420px]">
              {heroStill ? (
                <div className="hero-still-stage absolute inset-0" aria-hidden>
                  <Image
                    src={heroStill}
                    alt=""
                    fill
                    priority
                    quality={90}
                    className="hero-still object-cover object-center"
                    sizes="100vw"
                  />
                  <div className="hero-backdrop-wash hero-backdrop-wash--cinematic absolute inset-0 pointer-events-none" />
                  <div className="hero-wide-fade pointer-events-none absolute inset-0" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-black" />
              )}

              <div
                className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-6 lg:px-8 pb-12"
                style={{
                  paddingTop: "max(5.5rem, calc(5rem + env(safe-area-inset-top, 0px)))",
                }}
              >
                <Link
                  href={filmPath}
                  className="mb-auto inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
                  aria-label={`Back to ${hub.movie.title}`}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>

                <div className="mt-8 flex items-end gap-8">
                  {posterThumb ? (
                    <div className="relative aspect-[2/3] w-36 shrink-0 overflow-hidden rounded-md ring-1 ring-white/[0.08] shadow-2xl shadow-black/70">
                      <Image
                        src={posterThumb}
                        alt=""
                        fill
                        priority
                        className="object-cover"
                        sizes="144px"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1 pb-1">
                    <p
                      className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em]"
                      style={{ color: "#FFD700" }}
                    >
                      Community ranking
                    </p>
                    <h1
                      className="max-w-3xl text-5xl font-bold leading-[1.1] tracking-tight text-white xl:text-[3.35rem]"
                      style={DISPLAY}
                    >
                      Who gave the best performance in {hub.movie.title}
                      {yearPart}?
                    </h1>
                    <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-300">
                      Ranked by ActorRating community scores from signed-in raters —{" "}
                      <span className="font-semibold text-white">
                        {hub.totalSignedInRatings} {ratingWord}
                      </span>{" "}
                      so far.{" "}
                      <Link
                        href={filmPath}
                        className="text-[#FFD700] underline-offset-2 hover:underline"
                      >
                        Open the film page
                      </Link>
                    </p>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
                      {RANKING_PLAIN_SENTENCE}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <section className="mb-12 sm:mb-14" aria-labelledby="criteria-heading">
              <h2
                id="criteria-heading"
                className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
                style={DISPLAY}
              >
                What you rate
              </h2>
              <p className="mt-2 max-w-xl text-sm text-zinc-500">
                Same five craft dimensions as the rate page.
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {HUB_CRITERIA_LABELS.map((label) => (
                  <li
                    key={label}
                    className="rounded-md border border-white/10 bg-[#141414] px-3 py-1.5 text-xs font-medium text-zinc-300 sm:text-sm"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="ranked-heading">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
                <h2
                  id="ranked-heading"
                  className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
                  style={DISPLAY}
                >
                  Lead &amp; supporting
                </h2>
                <span className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                  {hub.rankedLeadsAndSupporting.length} roles
                </span>
              </div>

              <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3 md:gap-5">
                {hub.rankedLeadsAndSupporting.map((row, index) => {
                  const rateHref = `/rate/${movieSlug}/${row.actorSlug ?? row.actorId}`
                  const actorHref = `/actors/${row.actorSlug ?? row.actorId}`
                  const face =
                    upgradeActorImageRes(row.actorImageUrl) ?? row.actorImageUrl
                  const hasScore = row.count > 0 && row.avg10 != null
                  const label = scoreLabel(row.avg10, row.count)
                  const isTop = index === 0 && hasScore

                  return (
                    <li key={row.performanceId} className="flex">
                      <article
                        className={`relative flex h-full w-full flex-col overflow-hidden rounded-md border bg-[#141414] transition-colors ${
                          isTop
                            ? "border-[#FFD700]/35"
                            : "border-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        <div className="flex flex-1 flex-col p-5 sm:p-6">
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <span
                              className="text-2xl font-semibold tabular-nums text-[#FFD700]"
                              style={DISPLAY}
                            >
                              #{index + 1}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                              {row.tier}
                            </span>
                          </div>

                          <div className="mb-5 flex justify-center">
                            <div className="relative aspect-[2/3] w-28 overflow-hidden rounded-md bg-zinc-900 ring-1 ring-white/10 sm:w-32">
                              {face ? (
                                <Image
                                  src={face}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="128px"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600">
                                  —
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mb-4 text-center">
                            {hasScore ? (
                              <>
                                <div className="flex items-baseline justify-center gap-1">
                                  <span
                                    className="text-3xl font-bold tabular-nums text-[#FFD700]"
                                    style={DISPLAY}
                                  >
                                    {label}
                                  </span>
                                  <span className="text-sm text-zinc-500">/10</span>
                                </div>
                                <p className="mt-1 text-xs text-zinc-500">
                                  {row.count} {row.count === 1 ? "rating" : "ratings"}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm font-medium text-[#FFD700]/80">
                                Be the first to rate
                              </p>
                            )}
                          </div>

                          <div className="mb-2 text-center">
                            <Link
                              href={actorHref}
                              className="inline-flex items-center gap-1.5 text-lg font-semibold tracking-wide text-white underline decoration-dotted decoration-2 underline-offset-2 transition-colors hover:decoration-solid hover:text-[#FFD700]"
                            >
                              <span>{row.actorName}</span>
                              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                            </Link>
                          </div>
                          {row.character ? (
                            <p className="mb-5 text-center text-base italic font-light text-[#e4e4e7] sm:text-lg">
                              as {row.character}
                            </p>
                          ) : (
                            <div className="mb-5" />
                          )}

                          <div className="mt-auto pt-2">
                            <a
                              href={rateHref}
                              data-hub-rate-performance-id={row.performanceId}
                              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.02]"
                              style={{ background: GOLD_CTA }}
                            >
                              Rate this performance
                              <ArrowRight className="h-4 w-4" aria-hidden />
                            </a>
                          </div>
                        </div>
                      </article>
                    </li>
                  )
                })}
              </ol>
            </section>

            {hub.fullCastMinors.length > 0 ? (
              <section className="mt-14 sm:mt-16" aria-labelledby="full-cast-heading">
                <h2
                  id="full-cast-heading"
                  className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
                  style={DISPLAY}
                >
                  Full cast
                </h2>
                <p className="mt-2 max-w-xl text-sm text-zinc-500">
                  Additional credits — every role is rateable.
                </p>

                <ul className="mt-6 divide-y divide-white/[0.06] overflow-hidden rounded-md border border-white/[0.08] bg-[#141414]">
                  {hub.fullCastMinors.map((row) => {
                    const rateHref = `/rate/${movieSlug}/${row.actorSlug ?? row.actorId}`
                    const actorHref = `/actors/${row.actorSlug ?? row.actorId}`
                    const face =
                      upgradeActorImageRes(row.actorImageUrl) ?? row.actorImageUrl
                    const hasScore = row.count > 0 && row.avg10 != null

                    return (
                      <li
                        key={row.performanceId}
                        className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4"
                      >
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-zinc-900 ring-1 ring-white/10 sm:h-12 sm:w-12">
                          {face ? (
                            <Image
                              src={face}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={actorHref}
                            className="font-medium text-zinc-100 underline-offset-2 hover:text-[#FFD700] hover:underline"
                          >
                            {row.actorName}
                          </Link>
                          {row.character ? (
                            <p className="truncate text-xs italic text-zinc-500">
                              as {row.character}
                            </p>
                          ) : null}
                          {hasScore ? (
                            <p className="mt-0.5 text-xs tabular-nums text-zinc-500">
                              <span className="text-[#FFD700]">
                                {row.avg10!.toFixed(1)}/10
                              </span>
                              {" · "}
                              {row.count} {row.count === 1 ? "rating" : "ratings"}
                            </p>
                          ) : null}
                        </div>
                        <a
                          href={rateHref}
                          data-hub-rate-performance-id={row.performanceId}
                          className="inline-flex min-h-[40px] shrink-0 items-center rounded-md px-3 py-2 text-xs font-bold text-black sm:text-sm"
                          style={{ background: GOLD_CTA }}
                        >
                          Rate
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            <p className="mt-12 text-center text-sm text-zinc-600">
              <Link
                href={filmPath}
                className="text-zinc-400 transition-colors hover:text-[#FFD700]"
              >
                ← Back to {hub.movie.title}
              </Link>
            </p>
          </div>
        </main>
      </HomeLayout>
    </>
  )
}
