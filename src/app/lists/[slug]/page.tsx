import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { HomeLayout } from "@/components/layout"
import { loadListBySlug, renderMarkdownToHtml } from "@/lib/lists/load-lists"
import { enrichListEntries } from "@/lib/lists/enrich-entries"
import { upgradeActorImageRes } from "@/lib/tmdb"

/** Always enrich from live DB — never bake slug fallbacks into static HTML/JSON-LD at build. */
export const dynamic = "force-dynamic"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const list = loadListBySlug(slug)
  if (!list) {
    return { title: "List Not Found", robots: { index: false, follow: true } }
  }
  const url = `${BASE_URL}/lists/${list.slug}`

  let ogImage: string | undefined
  try {
    const enriched = await enrichListEntries(list.entries.slice(0, 1), list.slug)
    const first = enriched[0]
    const img = upgradeActorImageRes(first?.actorImageUrl) ?? first?.moviePosterUrl
    if (img) ogImage = img
  } catch {
    /* metadata still works without OG image */
  }

  return {
    title: list.title,
    description: list.description,
    alternates: { canonical: url },
    openGraph: {
      title: list.title,
      description: list.description,
      url,
      type: "article",
      publishedTime: list.publishedAt.toISOString(),
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: list.title,
      description: list.description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}

export default async function ListPage({ params }: Props) {
  await connection()

  const { slug } = await params
  const list = loadListBySlug(slug)
  if (!list) notFound()

  let enriched
  try {
    enriched = await enrichListEntries(list.entries, list.slug)
  } catch (err) {
    console.error(`[lists:${list.slug}] Failed to enrich entries from DB:`, err)
    enriched = list.entries.map((entry) => ({
      actorSlug: entry.actorSlug,
      movieSlug: entry.movieSlug,
      actorName: entry.actorSlug,
      movieTitle: entry.movieSlug,
      movieYear: null as number | null,
      actorImageUrl: null as string | null,
      moviePosterUrl: null as string | null,
      movieCriticAggregate: null as number | null,
      ratePath: `/rate/${entry.movieSlug}/${entry.actorSlug}`,
      communityAvg10: null as number | null,
      communityRatingCount: 0,
      tier: null as string | null,
      indexable: false,
      exists: false,
      warning: "DB enrichment unavailable",
    }))
  }
  const introHtml = renderMarkdownToHtml(list.introMarkdown)
  const pageUrl = `${BASE_URL}/lists/${list.slug}`

  const jsonLdItems = enriched
    .filter((entry) => entry.exists)
    .map((entry, index) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name: `${entry.actorName} in ${entry.movieTitle}`,
      url: `${BASE_URL}${entry.ratePath}`,
    }))

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: list.title,
    description: list.description,
    url: pageUrl,
    numberOfItems: jsonLdItems.length,
    itemListElement: jsonLdItems,
  }

  const heroPoster = enriched.find((e) => e.moviePosterUrl)?.moviePosterUrl
  const heroActor = upgradeActorImageRes(
    enriched.find((e) => e.actorImageUrl)?.actorImageUrl,
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeLayout>
        <main className="min-h-screen bg-black text-white">
          {/* Atmosphere strip — poster wash behind the title */}
          <div className="relative overflow-hidden border-b border-white/[0.06]">
            {heroPoster && (
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <Image
                  src={heroPoster}
                  alt=""
                  fill
                  priority
                  className="object-cover object-top opacity-[0.22] scale-110 blur-sm"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/85 to-black" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/40" />
              </div>
            )}

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-12 sm:pb-16">
              <nav className="mb-8 text-sm text-zinc-500">
                <Link href="/lists" className="hover:text-[#FFD700] transition-colors">
                  Lists
                </Link>
                <span className="mx-2 text-zinc-700">/</span>
                <span className="text-zinc-400 line-clamp-1">{list.title}</span>
              </nav>

              <div className="flex flex-col sm:flex-row gap-8 sm:gap-10 items-start">
                {heroActor && (
                  <div className="relative w-28 sm:w-36 shrink-0 aspect-[2/3] overflow-hidden rounded-sm ring-1 ring-white/10 shadow-2xl shadow-black/60">
                    <Image
                      src={heroActor}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="144px"
                      priority
                    />
                  </div>
                )}
                <header className="min-w-0 flex-1">
                  <p
                    className="text-[10px] font-bold tracking-[0.22em] uppercase mb-3"
                    style={{ color: "#FFD700" }}
                  >
                    ActorRating List
                  </p>
                  <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-[1.1]">
                    {list.title}
                  </h1>
                  <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl mb-5">
                    {list.description}
                  </p>
                  <time
                    dateTime={list.publishedAt.toISOString()}
                    className="text-xs uppercase tracking-wider text-zinc-600"
                  >
                    {list.publishedAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </header>
              </div>
            </div>
          </div>

          <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            {introHtml && (
              <div
                className="prose-lists mb-16 text-base sm:text-lg leading-relaxed text-zinc-400 max-w-3xl [&_p]:mb-4 [&_a]:text-[#FFD700] [&_a]:underline-offset-2 hover:[&_a]:underline [&_strong]:text-zinc-200"
                dangerouslySetInnerHTML={{ __html: introHtml }}
              />
            )}

            <ol className="space-y-0 list-none p-0 m-0">
              {enriched.map((entry, index) => {
                const commentaryHtml = renderMarkdownToHtml(list.entryMarkdown[index] ?? "")
                const yearPart = entry.movieYear ? ` (${entry.movieYear})` : ""
                const actorImg = upgradeActorImageRes(entry.actorImageUrl) ?? entry.actorImageUrl
                const poster = entry.moviePosterUrl

                return (
                  <li
                    key={`${entry.movieSlug}:${entry.actorSlug}`}
                    className="grid grid-cols-1 sm:grid-cols-[7.5rem_1fr] gap-5 sm:gap-7 py-10 sm:py-12 border-t border-white/[0.07]"
                  >
                    <div className="flex sm:flex-col gap-3">
                      <div className="relative w-20 sm:w-full aspect-[2/3] overflow-hidden rounded-sm bg-zinc-900 ring-1 ring-white/10 shrink-0">
                        {actorImg ? (
                          <Image
                            src={actorImg}
                            alt={entry.actorName}
                            fill
                            className="object-cover"
                            sizes="120px"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-xs">
                            —
                          </div>
                        )}
                      </div>
                      {poster && (
                        <div className="relative w-14 sm:w-full aspect-[2/3] overflow-hidden rounded-sm bg-zinc-900 ring-1 ring-white/10 opacity-80 shrink-0 hidden sm:block">
                          <Image
                            src={poster}
                            alt={entry.movieTitle}
                            fill
                            className="object-cover"
                            sizes="120px"
                          />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-bold tracking-[0.22em] uppercase mb-2 text-zinc-600">
                        #{String(index + 1).padStart(2, "0")}
                      </p>
                      <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 leading-snug">
                        <Link
                          href={entry.ratePath}
                          className="hover:text-[#FFD700] transition-colors"
                        >
                          {entry.actorName}
                        </Link>
                        <span className="text-zinc-600 font-medium"> in </span>
                        <Link
                          href={entry.ratePath}
                          className="hover:text-[#FFD700] transition-colors"
                        >
                          {entry.movieTitle}
                          {yearPart}
                        </Link>
                      </h2>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mb-5 text-zinc-400">
                        <Link
                          href={entry.ratePath}
                          className="text-[#FFD700] hover:underline underline-offset-2 font-medium"
                        >
                          Rate this performance →
                        </Link>
                        {entry.communityAvg10 != null && entry.communityRatingCount > 0 ? (
                          <span>
                            Community{" "}
                            <span className="text-white font-semibold tabular-nums">
                              {entry.communityAvg10}/10
                            </span>
                            <span className="text-zinc-600">
                              {" "}
                              ({entry.communityRatingCount})
                            </span>
                          </span>
                        ) : (
                          <span className="text-zinc-600">Community: not yet rated</span>
                        )}
                        {entry.movieCriticAggregate != null && (
                          <span className="text-zinc-600">
                            Film Critic Aggregate{" "}
                            <span className="tabular-nums text-zinc-400">
                              {entry.movieCriticAggregate.toFixed(1)}
                            </span>
                          </span>
                        )}
                        {!entry.indexable && (
                          <span className="text-xs text-amber-700">
                            (SEO: may be noindex)
                          </span>
                        )}
                      </div>

                      {commentaryHtml && (
                        <div
                          className="prose-lists text-base leading-relaxed text-zinc-400 max-w-2xl [&_p]:mb-3 [&_a]:text-[#FFD700] [&_strong]:text-zinc-200"
                          dangerouslySetInnerHTML={{ __html: commentaryHtml }}
                        />
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>

            <div className="mt-16 pt-8 border-t border-white/[0.07]">
              <Link
                href="/lists"
                className="text-sm text-zinc-500 hover:text-[#FFD700] transition-colors"
              >
                ← All lists
              </Link>
            </div>
          </article>
        </main>
      </HomeLayout>
    </>
  )
}
