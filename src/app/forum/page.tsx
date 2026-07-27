import type { Metadata } from "next"
import Link from "next/link"
import { connection } from "next/server"
import { HomeLayout } from "@/components/layout"
import { ForumThreadCard } from "@/components/forum/ForumThreadCard"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"

export const metadata: Metadata = {
  title: "Debate Forum — ActorRating",
  description:
    "Role showdowns, snubs, craft debates, and film talk — community discussions about acting performances.",
  alternates: { canonical: `${BASE_URL}/forum` },
  openGraph: {
    title: "Debate Forum — ActorRating",
    description:
      "Role showdowns, snubs, craft debates, and film talk — community discussions about acting performances.",
    url: `${BASE_URL}/forum`,
    type: "website",
  },
}

export default async function ForumIndexPage() {
  await connection()

  const [categories, recentThreads] = await Promise.all([
    prisma.forumCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: { select: { threads: true } },
      },
    }),
    prisma.forumThread.findMany({
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      take: 12,
      select: {
        id: true,
        title: true,
        slug: true,
        isPinned: true,
        updatedAt: true,
        category: { select: { name: true, slug: true } },
        author: { select: { username: true, name: true } },
        actor: { select: { name: true, slug: true, imageUrl: true } },
        movie: { select: { title: true, slug: true, year: true, posterUrl: true } },
        _count: { select: { posts: true } },
      },
    }),
  ])

  return (
    <HomeLayout>
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <p
                className="text-[10px] font-bold tracking-[0.22em] uppercase mb-3"
                style={{ color: "#FFD700" }}
              >
                Community
              </p>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">Debate Forum</h1>
              <p className="text-base sm:text-lg leading-relaxed text-zinc-400 max-w-2xl">
                Argue the takes that matter — showdowns, snubs, craft, and everything in between.
              </p>
            </div>
            <Link
              href="/forum/new"
              className="inline-flex items-center justify-center rounded-sm px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-black"
              style={{ background: "linear-gradient(90deg, #FFD700, #FFA500)" }}
            >
              New thread
            </Link>
          </div>

          <section className="mb-16">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 mb-4">
              Categories
            </h2>
            <ul className="space-y-0 border-t border-white/[0.07]">
              {categories.map((cat) => (
                <li key={cat.id} className="border-b border-white/[0.07]">
                  <Link
                    href={`/forum/c/${cat.slug}`}
                    className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-5 transition-colors hover:bg-white/[0.02]"
                  >
                    <div>
                      <div className="text-lg font-semibold group-hover:text-[#FFD700] transition-colors">
                        {cat.name}
                      </div>
                      {cat.description ? (
                        <p className="mt-1 text-sm text-zinc-500">{cat.description}</p>
                      ) : null}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-zinc-600 shrink-0">
                      {cat._count.threads} thread{cat._count.threads === 1 ? "" : "s"}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 mb-4">
              Recent debates
            </h2>
            {recentThreads.length === 0 ? (
              <p className="text-zinc-600">No threads yet — start the first debate.</p>
            ) : (
              <ul className="space-y-0 border-t border-white/[0.07]">
                {recentThreads.map((t) => (
                  <ForumThreadCard
                    key={t.id}
                    thread={{
                      id: t.id,
                      title: t.title,
                      slug: t.slug,
                      isPinned: t.isPinned,
                      updatedAt: t.updatedAt,
                      postCount: t._count.posts,
                      categoryName: t.category.name,
                      author: t.author,
                      actor: t.actor,
                      movie: t.movie,
                    }}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </HomeLayout>
  )
}
