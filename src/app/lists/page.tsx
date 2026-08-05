import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { connection } from "next/server"
import { HomeLayout } from "@/components/layout"
import { loadAllLists } from "@/lib/lists/load-lists"
import { enrichListEntries } from "@/lib/lists/enrich-entries"
import { upgradeActorImageRes } from "@/lib/tmdb"

export const dynamic = "force-dynamic"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"

export const metadata: Metadata = {
  title: "Lists",
  description:
    "Hand-authored performance listicles that dig into acting — with real links to ActorRating community scores.",
  alternates: { canonical: `${BASE_URL}/lists` },
  openGraph: {
    title: "Lists",
    description:
      "Hand-authored performance listicles that dig into acting — with real links to ActorRating community scores.",
    url: `${BASE_URL}/lists`,
    type: "website",
  },
}

export default async function ListsIndexPage() {
  await connection()
  const lists = loadAllLists()

  const covers = await Promise.all(
    lists.map(async (list) => {
      try {
        const first = (await enrichListEntries(list.entries.slice(0, 1), list.slug))[0]
        return {
          slug: list.slug,
          actorImage: upgradeActorImageRes(first?.actorImageUrl) ?? first?.actorImageUrl ?? null,
          poster: first?.moviePosterUrl ?? null,
        }
      } catch {
        return { slug: list.slug, actorImage: null, poster: null }
      }
    }),
  )
  const coverBySlug = Object.fromEntries(covers.map((c) => [c.slug, c]))

  return (
    <HomeLayout>
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <p
            className="text-[10px] font-bold tracking-[0.22em] uppercase mb-3"
            style={{ color: "#FFD700" }}
          >
            Curated
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">Lists</h1>
          <p className="text-base sm:text-lg mb-14 leading-relaxed text-zinc-400 max-w-2xl">
            Hand-written comparisons and deep-dives that link into real ActorRating performance
            pages — not templated filmography dumps. Score the acting, not just the movie.
          </p>

          {lists.length === 0 ? (
            <p className="text-zinc-600">No lists published yet.</p>
          ) : (
            <ul className="space-y-0">
              {lists.map((list) => {
                const cover = coverBySlug[list.slug]
                const thumb = cover?.actorImage ?? cover?.poster
                return (
                  <li key={list.slug} className="border-t border-white/[0.07]">
                    <Link
                      href={`/lists/${list.slug}`}
                      className="group flex gap-5 sm:gap-7 py-7 sm:py-8 items-start transition-colors"
                    >
                      <div className="relative w-16 sm:w-20 aspect-[2/3] shrink-0 overflow-hidden rounded-sm bg-zinc-900 ring-1 ring-white/10">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="80px"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-[#FFD700] transition-colors leading-snug">
                          {list.title}
                        </h2>
                        <p className="text-sm leading-relaxed mb-3 text-zinc-400 line-clamp-2">
                          {list.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wider text-zinc-600">
                          <time dateTime={list.publishedAt.toISOString()}>
                            {list.publishedAt.toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </time>
                          <span>·</span>
                          <span>{list.entries.length} performances</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </HomeLayout>
  )
}
