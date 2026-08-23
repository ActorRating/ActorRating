import Image from "next/image"
import { InstantNavLink } from "@/components/ui/InstantNavLink"
import { HomeLayout } from "@/components/layout"
import {
  renderEditorialMarkdown,
  type EditorialKind,
  type ParsedEditorialDocument,
} from "@/lib/editorial/load-editorial"
import { resolveEditorialHeroImage } from "@/lib/editorial/enrich-covers"
import { enrichListEntries } from "@/lib/lists/enrich-entries"
import { upgradeActorImageRes } from "@/lib/tmdb"

const DISPLAY = 'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"

const KIND_META: Record<
  EditorialKind,
  { indexHref: string; indexLabel: string; badge: string }
> = {
  story: { indexHref: "/stories", indexLabel: "Stories", badge: "Story" },
  news: { indexHref: "/news", indexLabel: "News", badge: "News" },
}

function upgradePosterRes(url: string | null | undefined): string | null {
  if (!url) return null
  return url
    .replace("/t/p/w92/", "/t/p/w780/")
    .replace("/t/p/w154/", "/t/p/w780/")
    .replace("/t/p/w185/", "/t/p/w780/")
    .replace("/t/p/w342/", "/t/p/w780/")
    .replace("/t/p/w500/", "/t/p/w780/")
}

export async function EditorialArticlePage({
  doc,
}: {
  doc: ParsedEditorialDocument
}) {
  const meta = KIND_META[doc.kind]
  const bodyHtml = renderEditorialMarkdown(doc.bodyMarkdown)
  const pageUrl = `${BASE_URL}${meta.indexHref}/${doc.slug}`

  let related: Awaited<ReturnType<typeof enrichListEntries>> = []
  if (doc.related.length > 0) {
    try {
      related = await enrichListEntries(doc.related, `${doc.kind}:${doc.slug}`)
    } catch {
      related = []
    }
  }

  const heroImage =
    (await resolveEditorialHeroImage(doc)) ??
    upgradePosterRes(related.find((r) => r.moviePosterUrl)?.moviePosterUrl) ??
    upgradeActorImageRes(related.find((r) => r.actorImageUrl)?.actorImageUrl)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: doc.title,
    description: doc.description,
    datePublished: doc.publishedAt.toISOString(),
    url: pageUrl,
    author: { "@type": "Organization", name: "ActorRating" },
    publisher: {
      "@type": "Organization",
      name: "ActorRating",
      url: BASE_URL,
    },
    ...(heroImage ? { image: [heroImage] } : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeLayout>
        <main className="min-h-screen bg-black text-white">
          <div className="relative overflow-hidden border-b border-white/[0.06]">
            {heroImage && (
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <Image
                  src={heroImage}
                  alt=""
                  fill
                  priority
                  className="object-cover object-center opacity-[0.35] scale-110 blur-[2px]"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/80 to-black" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              </div>
            )}

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-12 sm:pb-16">
              <nav className="mb-8 text-sm text-zinc-500">
                <InstantNavLink href={meta.indexHref} className="hover:text-[#FFD700] transition-colors">
                  {meta.indexLabel}
                </InstantNavLink>
                <span className="mx-2 text-zinc-700">/</span>
                <span className="text-zinc-400 line-clamp-1">{doc.title}</span>
              </nav>

              <div className="flex flex-col gap-8 sm:gap-10">
                {heroImage && (
                  <div className="relative w-full aspect-[16/9] overflow-hidden rounded-md ring-1 ring-white/10 shadow-2xl shadow-black/60">
                    <Image
                      src={heroImage}
                      alt=""
                      fill
                      className="object-cover object-center"
                      sizes="(max-width: 896px) 100vw, 896px"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                )}
                <header className="min-w-0 flex-1">
                  <p
                    className="text-[10px] font-bold tracking-[0.22em] uppercase mb-3"
                    style={{ color: "#FFD700" }}
                  >
                    {meta.badge}
                  </p>
                  <h1
                    className="text-3xl sm:text-5xl font-semibold tracking-tight mb-4 leading-[1.12] text-white"
                    style={{ fontFamily: DISPLAY }}
                  >
                    {doc.title}
                  </h1>
                  <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl mb-5">
                    {doc.description}
                  </p>
                  <time
                    dateTime={doc.publishedAt.toISOString()}
                    className="text-xs uppercase tracking-wider text-zinc-500"
                  >
                    {doc.publishedAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </header>
              </div>
            </div>
          </div>

          <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            {bodyHtml && (
              <div
                className="editorial-prose text-base sm:text-lg leading-relaxed text-zinc-400 max-w-3xl [&_p]:mb-5 [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:sm:text-2xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:tracking-tight [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-2 [&_li]:leading-relaxed [&_a]:text-[#FFD700] [&_a]:underline-offset-2 hover:[&_a]:underline [&_strong]:text-zinc-200 [&_table]:mb-6 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-white/15 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-zinc-200 [&_td]:border [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            )}

            {related.some((r) => r.exists) && (
              <div className="mt-16 pt-10 border-t border-white/[0.07]">
                <p
                  className="text-[10px] font-bold tracking-[0.22em] uppercase mb-5"
                  style={{ color: "#FFD700" }}
                >
                  Rate these next
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {related
                    .filter((r) => r.exists)
                    .map((entry) => {
                      const actorImg =
                        upgradeActorImageRes(entry.actorImageUrl) ?? entry.actorImageUrl
                      const poster = upgradePosterRes(entry.moviePosterUrl) ?? entry.moviePosterUrl
                      const thumb = actorImg ?? poster
                      return (
                        <li key={`${entry.movieSlug}:${entry.actorSlug}`}>
                          <InstantNavLink
                            href={entry.ratePath}
                            className="group flex gap-3.5 overflow-hidden rounded-md border border-white/[0.08] bg-[#141414] p-3 hover:border-[#FFD700]/30 transition-colors"
                          >
                            <div className="relative w-16 aspect-[2/3] shrink-0 overflow-hidden rounded-sm bg-zinc-900 ring-1 ring-white/10">
                              {thumb ? (
                                <Image
                                  src={thumb}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex flex-col justify-center">
                              <p
                                className="text-base font-semibold text-white group-hover:text-[#FFD700] transition-colors leading-snug"
                                style={{ fontFamily: DISPLAY }}
                              >
                                {entry.actorName}
                              </p>
                              <p className="text-sm text-zinc-500 mt-0.5">
                                {entry.movieTitle}
                                {entry.movieYear != null ? ` (${entry.movieYear})` : ""}
                              </p>
                              {entry.communityAvg10 != null && (
                                <p className="text-xs text-[#FFD700] mt-1.5">
                                  Community {entry.communityAvg10.toFixed(1)}
                                </p>
                              )}
                            </div>
                          </InstantNavLink>
                        </li>
                      )
                    })}
                </ul>
              </div>
            )}
          </article>
        </main>
      </HomeLayout>
    </>
  )
}
