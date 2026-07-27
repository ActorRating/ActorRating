import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { HomeLayout } from "@/components/layout"
import { ForumThreadCard } from "@/components/forum/ForumThreadCard"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"

type Props = { params: Promise<{ categorySlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params
  const cat = await prisma.forumCategory.findUnique({
    where: { slug: categorySlug },
    select: { name: true, description: true },
  })
  if (!cat) return { title: "Forum — ActorRating" }
  return {
    title: `${cat.name} — Debate Forum — ActorRating`,
    description: cat.description || `Debates in ${cat.name} on ActorRating.`,
    alternates: { canonical: `${BASE_URL}/forum/c/${categorySlug}` },
  }
}

export default async function ForumCategoryPage({ params }: Props) {
  await connection()
  const { categorySlug } = await params

  const category = await prisma.forumCategory.findUnique({
    where: { slug: categorySlug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
    },
  })
  if (!category) notFound()

  const threads = await prisma.forumThread.findMany({
    where: { categoryId: category.id },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: 60,
    select: {
      id: true,
      title: true,
      slug: true,
      isPinned: true,
      isLocked: true,
      updatedAt: true,
      author: { select: { username: true, name: true } },
      actor: { select: { name: true, slug: true, imageUrl: true } },
      movie: { select: { title: true, slug: true, year: true, posterUrl: true } },
      _count: { select: { posts: true } },
    },
  })

  return (
    <HomeLayout>
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <nav className="text-xs text-zinc-500 mb-6">
            <Link href="/forum" className="hover:text-[#FFD700]">
              Forum
            </Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-300">{category.name}</span>
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
                {category.name}
              </h1>
              {category.description ? (
                <p className="text-zinc-400 max-w-2xl">{category.description}</p>
              ) : null}
            </div>
            <Link
              href={`/forum/new?category=${category.slug}`}
              className="inline-flex items-center justify-center rounded-sm px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-black"
              style={{ background: "linear-gradient(90deg, #FFD700, #FFA500)" }}
            >
              New thread
            </Link>
          </div>

          {threads.length === 0 ? (
            <p className="text-zinc-600">No threads in this category yet.</p>
          ) : (
            <ul className="border-t border-white/[0.07]">
              {threads.map((t) => (
                <ForumThreadCard
                  key={t.id}
                  thread={{
                    id: t.id,
                    title: t.title,
                    slug: t.slug,
                    isPinned: t.isPinned,
                    isLocked: t.isLocked,
                    updatedAt: t.updatedAt,
                    postCount: t._count.posts,
                    author: t.author,
                    actor: t.actor,
                    movie: t.movie,
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </main>
    </HomeLayout>
  )
}
