import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { HomeLayout } from "@/components/layout"
import { loadListBySlug, renderMarkdownToHtml } from "@/lib/lists/load-lists"
import { enrichListEntries } from "@/lib/lists/enrich-entries"

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
    },
    twitter: {
      card: "summary_large_image",
      title: list.title,
      description: list.description,
    },
  }
}

export default async function ListPage({ params }: Props) {
  // Opt into request-time rendering so Coolify's SKIP_BUILD_TIME_DB build
  // cannot ship ItemList JSON-LD with raw slug "names".
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

  // Only emit structured data for rows we resolved to real Person/Movie names.
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeLayout>
        <main className="min-h-screen bg-black text-white">
          <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <nav className="mb-8 text-sm" style={{ color: "#71717a" }}>
              <Link href="/lists" className="hover:text-[#FFD700] transition-colors">
                Lists
              </Link>
              <span className="mx-2">/</span>
              <span style={{ color: "#a1a1aa" }}>{list.title}</span>
            </nav>

            <header className="mb-10">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: "#71717a" }}>
                List
              </p>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
                {list.title}
              </h1>
              <time
                dateTime={list.publishedAt.toISOString()}
                className="text-xs uppercase tracking-wider"
                style={{ color: "#52525b" }}
              >
                {list.publishedAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </header>

            {introHtml && (
              <div
                className="prose-lists mb-14 text-base sm:text-lg leading-relaxed"
                style={{ color: "#a1a1aa" }}
                dangerouslySetInnerHTML={{ __html: introHtml }}
              />
            )}

            <ol className="space-y-14 list-none p-0 m-0">
              {enriched.map((entry, index) => {
                const commentaryHtml = renderMarkdownToHtml(list.entryMarkdown[index] ?? "")
                const yearPart = entry.movieYear ? ` (${entry.movieYear})` : ""
                return (
                  <li
                    key={`${entry.movieSlug}:${entry.actorSlug}`}
                    className="rounded-2xl p-5 sm:p-7"
                    style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
                  >
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: "#52525b" }}>
                      #{index + 1}
                    </p>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-snug">
                      <Link
                        href={entry.ratePath}
                        className="underline decoration-dotted decoration-2 underline-offset-4 hover:decoration-solid hover:text-[#FFD700] transition-colors"
                      >
                        {entry.actorName}
                      </Link>
                      <span style={{ color: "#71717a" }}> in </span>
                      <Link
                        href={entry.ratePath}
                        className="underline decoration-dotted decoration-2 underline-offset-4 hover:decoration-solid hover:text-[#FFD700] transition-colors"
                      >
                        {entry.movieTitle}
                        {yearPart}
                      </Link>
                    </h2>

                    <p className="text-sm mb-5" style={{ color: "#a1a1aa" }}>
                      <Link href={entry.ratePath} className="text-[#FFD700] hover:underline">
                        Rate this performance
                      </Link>
                      {entry.communityAvg10 != null && entry.communityRatingCount > 0 ? (
                        <span>
                          {" "}
                          · Community:{" "}
                          <span className="text-white font-semibold tabular-nums">
                            {entry.communityAvg10}/10
                          </span>
                          <span style={{ color: "#52525b" }}>
                            {" "}
                            ({entry.communityRatingCount}{" "}
                            {entry.communityRatingCount === 1 ? "rating" : "ratings"})
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: "#71717a" }}> · Community: Not yet rated</span>
                      )}
                      {!entry.indexable && (
                        <span className="ml-2 text-xs" style={{ color: "#a16207" }}>
                          (SEO warning: page may be noindex)
                        </span>
                      )}
                    </p>

                    {commentaryHtml && (
                      <div
                        className="prose-lists text-base leading-relaxed"
                        style={{ color: "#a1a1aa" }}
                        dangerouslySetInnerHTML={{ __html: commentaryHtml }}
                      />
                    )}
                  </li>
                )
              })}
            </ol>
          </article>
        </main>
      </HomeLayout>
    </>
  )
}
