import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { HomeLayout } from "@/components/layout"
import { ForumThreadClient } from "@/components/forum/ForumThreadClient"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://actorrating.com"

type Props = { params: Promise<{ threadSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { threadSlug } = await params
  const thread = await prisma.forumThread.findUnique({
    where: { slug: threadSlug },
    select: { title: true },
  })
  if (!thread) return { title: "Thread — ActorRating", robots: { index: false, follow: false } }
  return {
    title: `${thread.title} — Debate Forum — ActorRating`,
    alternates: { canonical: `${BASE_URL}/forum/t/${threadSlug}` },
    // Thin UGC: discoverable via forum hub, not as standalone SEO targets.
    robots: { index: false, follow: true },
  }
}

export default async function ForumThreadPage({ params }: Props) {
  await connection()
  const { threadSlug } = await params

  const thread = await prisma.forumThread.findUnique({
    where: { slug: threadSlug },
    select: {
      id: true,
      title: true,
      slug: true,
      isLocked: true,
      isPinned: true,
      createdAt: true,
      author: { select: { username: true, name: true } },
      category: { select: { name: true, slug: true } },
      actor: { select: { id: true, name: true, slug: true, imageUrl: true } },
      movie: { select: { id: true, title: true, slug: true, year: true, posterUrl: true } },
      posts: {
        where: { isHidden: false },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          isSpoiler: true,
          isOriginal: true,
          createdAt: true,
          authorId: true,
          author: { select: { username: true, name: true } },
        },
      },
    },
  })

  if (!thread) notFound()

  const author = thread.author.username
    ? `@${thread.author.username}`
    : thread.author.name?.trim() || "User"

  const posts = thread.posts.map((p) => ({
    id: p.id,
    content: p.content,
    isSpoiler: p.isSpoiler,
    isOriginal: p.isOriginal,
    createdAt: p.createdAt.toISOString(),
    authorId: p.authorId,
    username: p.author.username,
    displayName: p.author.username
      ? `@${p.author.username}`
      : p.author.name?.trim() || "User",
  }))

  return (
    <HomeLayout>
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <nav className="text-xs text-zinc-500 mb-6">
            <Link href="/forum" className="hover:text-[#FFD700]">
              Forum
            </Link>
            <span className="mx-2">/</span>
            <Link href={`/forum/c/${thread.category.slug}`} className="hover:text-[#FFD700]">
              {thread.category.name}
            </Link>
          </nav>

          <header className="mb-8 pb-6 border-b border-white/[0.07]">
            <div className="flex gap-5 sm:gap-6 items-start">
              {(() => {
                const raw = thread.actor?.imageUrl || thread.movie?.posterUrl
                if (!raw) return null
                const src = raw
                  .replace(/\/t\/p\/w\d+\//, "/t/p/w342/")
                  .replace(/\/t\/p\/h\d+\//, "/t/p/w342/")
                return (
                  <div className="relative w-20 sm:w-24 aspect-[2/3] shrink-0 overflow-hidden rounded-sm bg-zinc-900 ring-1 ring-white/10">
                    <Image src={src} alt="" fill className="object-cover" sizes="96px" />
                  </div>
                )
              })()}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-zinc-500 mb-3">
                  {thread.isPinned ? <span className="text-[#FFD700]">Pinned</span> : null}
                  {thread.isLocked ? <span>Locked</span> : null}
                  <span>{thread.category.name}</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">{thread.title}</h1>
                <p className="text-sm text-zinc-500">
                  Started by {author} ·{" "}
                  {thread.createdAt.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                {(thread.actor || thread.movie) && (
                  <p className="mt-3 text-sm text-zinc-400">
                    Linked:{" "}
                    {thread.actor ? (
                      <Link
                        href={`/actors/${thread.actor.slug || thread.actor.id}`}
                        className="text-[#FFD700] hover:underline"
                      >
                        {thread.actor.name}
                      </Link>
                    ) : null}
                    {thread.actor && thread.movie ? " · " : null}
                    {thread.movie ? (
                      <Link
                        href={`/movies/${thread.movie.slug || thread.movie.id}`}
                        className="text-[#FFD700] hover:underline"
                      >
                        {thread.movie.title} ({thread.movie.year})
                      </Link>
                    ) : null}
                  </p>
                )}
              </div>
            </div>
          </header>

          <ForumThreadClient slug={thread.slug} initialPosts={posts} isLocked={thread.isLocked} />
        </div>
      </main>
    </HomeLayout>
  )
}
