/**
 * Best-performances hub: /movies/[slug]/best-performances
 * Prisma SSR — no self-fetch. Visual language matches landing + movie pages.
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

/** Landing continuity for the Odyssey hub — same still as the homepage hero. */
const ODYSSEY_HERO_STILL = "/hero/odyssey-damon-forest.jpg"

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
  return `${avg10.toFixed(1)}`
}

function upgradePosterBackdrop(url?: string | null): string | null {
  if (!url) return null
  return url
    .replace(/\/t\/p\/w\d+\//, "/t/p/w1280/")
    .replace(/\/t\/p\/original\//, "/t/p/w1280/")
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
  const heroStill =
    movieSlug === "the-odyssey-2026"
      ? ODYSSEY_HERO_STILL
      : upgradePosterBackdrop(hub.movie.posterUrl)
  const posterThumb = upgradePosterBackdrop(hub.movie.posterUrl)

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
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (prefers-reduced-motion: no-preference) {
              .hub-rise { animation: hubRise 0.85s cubic-bezier(0.22, 1, 0.36, 1) both; }
              @keyframes hubRise {
                from { opacity: 0; transform: translateY(18px); }
                to { opacity: 1; transform: translateY(0); }
              }
            }
          `,
        }}
      />
      <OdysseyHubTracker movieSlug={movieSlug} movieTitle={hub.movie.title} />
      <HomeLayout>
        <main className="min-h-screen bg-black text-white">
          {/* Cinematic hero — landing still / poster wash */}
          <header className="relative overflow-hidden border-b border-white/[0.06]">
            {heroStill ? (
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <Image
                  src={heroStill}
                  alt=""
                  fill
                  priority
                  quality={85}
                  className="object-cover object-center scale-105 opacity-[0.38]"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/75 to-black" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/55 to-black/30" />
              </div>
            ) : null}

            <div
              className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8"
              style={{
                paddingTop: "max(5.5rem, calc(5rem + env(safe-area-inset-top, 0px)))",
                paddingBottom: "3.5rem",
              }}
            >
              <Link
                href={filmPath}
                className="hub-rise mb-8 inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
                aria-label={`Back to ${hub.movie.title}`}
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>

              <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-end sm:gap-10">
                {posterThumb ? (
                  <div
                    className="hub-rise relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-md ring-1 ring-white/[0.08] shadow-2xl shadow-black/70 sm:w-36"
                    style={{ animationDelay: "60ms" }}
                  >
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

                <div
                  className="hub-rise min-w-0 flex-1 text-center sm:pb-1 sm:text-left"
                  style={{ animationDelay: "120ms" }}
                >
                  <p
                    className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em]"
                    style={{ color: "#FFD700" }}
                  >
                    Community ranking
                  </p>
                  <h1
                    className="text-4xl font-bold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-[3.35rem]"
                    style={DISPLAY}
                  >
                    Who gave the best performance in {hub.movie.title}
                    {yearPart}?
                  </h1>
                  <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
                    Ranked by ActorRating community scores from signed-in raters —{" "}
                    <span className="font-semibold text-zinc-200">
                      {hub.totalSignedInRatings} {ratingWord}
                    </span>{" "}
                    so far.{" "}
                    <Link
                      href={filmPath}
                      className="text-[#FFD700] underline-offset-2 transition-colors hover:underline"
                    >
                      Open the film page
                    </Link>
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
                    {RANKING_PLAIN_SENTENCE}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            {/* Criteria — what you rate */}
            <section
              className="hub-rise mb-14 sm:mb-16"
              style={{ animationDelay: "180ms" }}
              aria-labelledby="criteria-heading"
            >
              <h2
                id="criteria-heading"
                className="mb-4 text-2xl font-bold tracking-tight text-white sm:text-3xl"
                style={DISPLAY}
              >
                What you rate
              </h2>
              <p className="mb-5 max-w-xl text-sm text-zinc-500">
                Every score is the average of five craft dimensions — the same ones on
                the rate page.
              </p>
              <ul className="flex flex-wrap gap-2">
                {HUB_CRITERIA_LABELS.map((label) => (
                  <li
                    key={label}
                    className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 sm:text-sm"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </section>

            {/* Ranked LEAD + SUPPORTING */}
            <section aria-labelledby="ranked-heading">
              <div className="mb-8 flex items-end justify-between gap-4">
                <h2
                  id="ranked-heading"
                  className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
                  style={DISPLAY}
                >
                  Lead &amp; supporting
                </h2>
                <span className="hidden text-xs uppercase tracking-[0.18em] text-zinc-600 sm:inline">
                  {hub.rankedLeadsAndSupporting.length} roles
                </span>
              </div>

              <ol className="m-0 list-none space-y-0 p-0">
                {hub.rankedLeadsAndSupporting.map((row, index) => {
                  const rateHref = `/rate/${movieSlug}/${row.actorSlug ?? row.actorId}`
                  const actorHref = `/actors/${row.actorSlug ?? row.actorId}`
                  const face =
                    upgradeActorImageRes(row.actorImageUrl) ?? row.actorImageUrl
                  const hasScore = row.count > 0 && row.avg10 != null
                  const label = scoreLabel(row.avg10, row.count)

                  return (
                    <li
                      key={row.performanceId}
                      className="hub-rise border-t border-white/[0.07] py-8 sm:py-10"
                      style={{ animationDelay: `${220 + index * 45}ms` }}
                    >
                      <div className="flex gap-4 sm:gap-6">
                        <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-5">
                          <span
                            className="text-2xl font-semibold tabular-nums text-[#FFD700]/90 sm:w-10 sm:text-3xl sm:text-right"
                            style={DISPLAY}
                            aria-hidden
                          >
                            {index + 1}
                          </span>
                          <div className="relative aspect-[2/3] w-[4.5rem] overflow-hidden rounded-md bg-zinc-900 ring-1 ring-white/10 sm:w-24">
                            {face ? (
                              <Image
                                src={face}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="96px"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600">
                                —
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                          <div className="min-w-0">
                            <Link
                              href={actorHref}
                              className="text-xl font-semibold tracking-tight text-white transition-colors hover:text-[#FFD700] sm:text-2xl"
                              style={DISPLAY}
                            >
                              {row.actorName}
                            </Link>
                            {row.character ? (
                              <p className="mt-1 text-sm text-zinc-400">as {row.character}</p>
                            ) : null}
                            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                              {row.tier}
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 sm:items-end sm:text-right">
                            {hasScore ? (
                              <div>
                                <div className="flex items-baseline gap-1 sm:justify-end">
                                  <span
                                    className="text-3xl font-bold tabular-nums text-[#FFD700]"
                                    style={DISPLAY}
                                  >
                                    {label}
                                  </span>
                                  <span className="text-sm text-zinc-500">/10</span>
                                </div>
                                <p className="mt-0.5 text-xs text-zinc-500">
                                  {row.count} {row.count === 1 ? "rating" : "ratings"}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm font-medium text-zinc-400">
                                Be the first to rate
                              </p>
                            )}
                            <a
                              href={rateHref}
                              data-hub-rate-performance-id={row.performanceId}
                              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold text-black transition-transform duration-200 hover:scale-[1.02] sm:w-auto"
                              style={{ background: GOLD_CTA }}
                            >
                              Rate this performance
                              <ArrowRight className="h-4 w-4" aria-hidden />
                            </a>
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>

            {/* Full cast MINOR */}
            {hub.fullCastMinors.length > 0 ? (
              <section className="mt-16 sm:mt-20" aria-labelledby="full-cast-heading">
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

                <ul className="mt-8 divide-y divide-white/[0.06] rounded-md border border-white/[0.08] bg-white/[0.015]">
                  {hub.fullCastMinors.map((row) => {
                    const rateHref = `/rate/${movieSlug}/${row.actorSlug ?? row.actorId}`
                    const actorHref = `/actors/${row.actorSlug ?? row.actorId}`
                    const face =
                      upgradeActorImageRes(row.actorImageUrl) ?? row.actorImageUrl
                    const hasScore = row.count > 0 && row.avg10 != null

                    return (
                      <li
                        key={row.performanceId}
                        className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-3.5"
                      >
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-zinc-900 ring-1 ring-white/10 sm:h-12 sm:w-12">
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
                            className="font-medium text-zinc-100 transition-colors hover:text-[#FFD700]"
                          >
                            {row.actorName}
                          </Link>
                          {row.character ? (
                            <p className="truncate text-xs text-zinc-500">as {row.character}</p>
                          ) : null}
                          {hasScore ? (
                            <p className="mt-0.5 text-xs tabular-nums text-zinc-500">
                              <span className="text-[#FFD700]">{row.avg10!.toFixed(1)}/10</span>
                              {" · "}
                              {row.count} {row.count === 1 ? "rating" : "ratings"}
                            </p>
                          ) : null}
                        </div>
                        <a
                          href={rateHref}
                          data-hub-rate-performance-id={row.performanceId}
                          className="shrink-0 rounded-md border border-[#FFD700]/35 px-3 py-2 text-xs font-bold text-[#FFD700] transition-colors hover:border-[#FFD700]/70 hover:bg-[#FFD700]/10 sm:text-sm"
                        >
                          Rate
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            <p className="mt-14 text-center text-sm text-zinc-600">
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
