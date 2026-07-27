import Image from "next/image"
import Link from "next/link"

export type ForumThreadCardData = {
  id: string
  title: string
  slug: string
  isPinned?: boolean
  isLocked?: boolean
  updatedAt: Date
  postCount: number
  categoryName?: string
  author: { username: string | null; name: string | null }
  actor?: { name: string; slug: string | null; imageUrl: string | null } | null
  movie?: { title: string; slug: string | null; year: number; posterUrl: string | null } | null
}

function thumbUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url
    .replace(/\/t\/p\/w\d+\//, "/t/p/w185/")
    .replace(/\/t\/p\/h\d+\//, "/t/p/w185/")
}

function threadThumb(t: ForumThreadCardData): string | null {
  return thumbUrl(t.actor?.imageUrl) ?? thumbUrl(t.movie?.posterUrl)
}

export function ForumThreadCard({ thread }: { thread: ForumThreadCardData }) {
  const author = thread.author.username
    ? `@${thread.author.username}`
    : thread.author.name?.trim() || "User"
  const thumb = threadThumb(thread)

  return (
    <li className="border-b border-white/[0.07]">
      <Link
        href={`/forum/t/${thread.slug}`}
        className="group flex gap-4 sm:gap-5 py-5 hover:bg-white/[0.02] transition-colors"
      >
        {thumb ? (
          <div className="relative w-12 sm:w-14 aspect-[2/3] shrink-0 overflow-hidden rounded-sm bg-zinc-900 ring-1 ring-white/10">
            <Image
              src={thumb}
              alt=""
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500 mb-1.5">
            {thread.isPinned ? <span className="text-[#FFD700]">Pinned</span> : null}
            {thread.isLocked ? <span>Locked</span> : null}
            {thread.categoryName ? <span>{thread.categoryName}</span> : null}
            {thread.categoryName ? <span>·</span> : null}
            <span>
              {thread.postCount} post{thread.postCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="text-base sm:text-lg font-semibold text-white/95 group-hover:text-[#FFD700] transition-colors">
            {thread.title}
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            by {author} · updated{" "}
            {thread.updatedAt.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
      </Link>
    </li>
  )
}
