import Image from "next/image"
import Link from "next/link"
import type { EditorialCard } from "@/lib/editorial/load-editorial"

const DISPLAY = 'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif'

export function EditorialIndexGrid({
  items,
  variant = "stories",
}: {
  items: EditorialCard[]
  variant?: "stories" | "news"
}) {
  if (items.length === 0) {
    return <p className="text-zinc-600">Nothing published yet.</p>
  }

  if (variant === "news") {
    return (
      <ul className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
        {items.map((item) => {
          const image = item.coverImage ?? item.moviePoster ?? item.actorImage ?? null
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group flex gap-4 sm:gap-6 py-6 sm:py-7 items-start"
              >
                <div className="min-w-0 flex-1">
                  <time
                    dateTime={item.publishedAt}
                    className="text-[11px] uppercase tracking-wider text-zinc-600"
                  >
                    {new Date(item.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  <h2
                    className="mt-2 text-xl sm:text-2xl font-semibold text-white group-hover:text-[#FFD700] transition-colors leading-snug"
                    style={{ fontFamily: DISPLAY }}
                  >
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm sm:text-base text-zinc-500 leading-relaxed line-clamp-3 max-w-2xl">
                    {item.description}
                  </p>
                </div>
                {image && (
                  <div className="relative w-28 sm:w-36 aspect-[16/10] shrink-0 overflow-hidden rounded-sm bg-zinc-900 ring-1 ring-white/10">
                    <Image
                      src={image}
                      alt=""
                      fill
                      className="object-cover object-center transition-transform duration-400 group-hover:scale-105 pointer-events-none"
                      sizes="144px"
                    />
                  </div>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
      {items.map((item) => {
        const image = item.coverImage ?? item.moviePoster ?? item.actorImage ?? null
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group flex flex-col overflow-hidden rounded-md border border-white/[0.08] bg-[#141414] h-full hover:border-[#FFD700]/25 transition-colors"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
                {image ? (
                  <Image
                    src={image}
                    alt=""
                    fill
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.04] pointer-events-none"
                    sizes="(max-width: 640px) 100vw, 360px"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <time
                    dateTime={item.publishedAt}
                    className="text-[10px] uppercase tracking-wider text-zinc-400"
                  >
                    {new Date(item.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                  <h2
                    className="mt-1.5 text-lg sm:text-xl font-semibold text-white group-hover:text-[#FFD700] transition-colors leading-snug line-clamp-3"
                    style={{ fontFamily: DISPLAY }}
                  >
                    {item.title}
                  </h2>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-zinc-500 leading-relaxed line-clamp-3">
                  {item.description}
                </p>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
