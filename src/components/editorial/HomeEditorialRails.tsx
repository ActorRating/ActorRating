import Image from "next/image"
import Link from "next/link"
import type { EditorialCard } from "@/lib/editorial/load-editorial"

const DISPLAY = 'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function HomeEditorialRails({
  stories,
  news,
}: {
  stories: EditorialCard[]
  news: EditorialCard[]
}) {
  if (stories.length === 0 && news.length === 0) return null

  return (
    <section className="bg-black border-t border-white/[0.05]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-16 sm:space-y-20">
        {stories.length > 0 && <StoriesRail items={stories} />}
        {news.length > 0 && <NewsRail items={news} />}
      </div>
    </section>
  )
}

/** Visual / cinematic — poster-forward like Letterboxd Stories */
function StoriesRail({ items }: { items: EditorialCard[] }) {
  const [hero, ...rest] = items

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <p
            className="text-[10px] font-bold tracking-[0.22em] uppercase mb-2"
            style={{ color: "#FFD700" }}
          >
            Features
          </p>
          <h2
            className="text-2xl sm:text-3xl font-semibold text-white tracking-tight"
            style={{ fontFamily: DISPLAY }}
          >
            Recent Stories
          </h2>
        </div>
        <Link
          href="/stories"
          scroll={false}
          className="shrink-0 text-sm text-zinc-500 hover:text-[#FFD700] transition-colors"
        >
          All stories
        </Link>
      </div>

      {hero && <FeaturedStoryCard item={hero} />}

      {rest.length > 0 && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {rest.map((item) => (
            <StoryPosterCard key={item.href} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Journal / text-forward — denser list like Letterboxd News */
function NewsRail({ items }: { items: EditorialCard[] }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase mb-2 text-zinc-500">
            Journal
          </p>
          <h2
            className="text-2xl sm:text-3xl font-semibold text-white tracking-tight"
            style={{ fontFamily: DISPLAY }}
          >
            Recent News
          </h2>
        </div>
        <Link
          href="/news"
          scroll={false}
          className="shrink-0 text-sm text-zinc-500 hover:text-[#FFD700] transition-colors"
        >
          All news
        </Link>
      </div>

      <ul className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
        {items.map((item) => {
          const image = item.coverImage ?? item.moviePoster ?? item.actorImage ?? null
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                scroll={false}
                className="group flex gap-4 sm:gap-6 py-5 sm:py-6 items-start"
              >
                <div className="min-w-0 flex-1">
                  <time
                    dateTime={item.publishedAt}
                    className="text-[11px] uppercase tracking-wider text-zinc-600"
                  >
                    {formatDate(item.publishedAt)}
                  </time>
                  <h3
                    className="mt-1.5 text-lg sm:text-xl font-semibold text-white group-hover:text-[#FFD700] transition-colors leading-snug"
                    style={{ fontFamily: DISPLAY }}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-500 leading-relaxed line-clamp-2 max-w-2xl">
                    {item.description}
                  </p>
                </div>
                {image && (
                  <div className="relative w-24 sm:w-32 aspect-[16/10] shrink-0 overflow-hidden rounded-sm bg-zinc-900 ring-1 ring-white/10">
                    <Image
                      src={image}
                      alt=""
                      fill
                      className="object-cover object-center transition-transform duration-400 group-hover:scale-105"
                      sizes="128px"
                    />
                  </div>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FeaturedStoryCard({ item }: { item: EditorialCard }) {
  const image = item.coverImage ?? item.moviePoster ?? item.actorImage ?? null

  return (
    <Link
      href={item.href}
      scroll={false}
      className="group relative block overflow-hidden rounded-md border border-white/[0.08] bg-[#141414] min-h-[260px] sm:min-h-[340px]"
    >
      {image && (
        <Image
          src={image}
          alt=""
          fill
          className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 1024px) 100vw, 960px"
          priority
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/15" />
      <div className="relative z-10 flex h-full min-h-[260px] sm:min-h-[340px] items-end p-5 sm:p-8">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#FFD700] mb-2">
            Story
          </p>
          <time
            dateTime={item.publishedAt}
            className="text-[11px] uppercase tracking-wider text-zinc-400"
          >
            {formatDate(item.publishedAt)}
          </time>
          <h3
            className="mt-2 text-2xl sm:text-4xl font-semibold text-white group-hover:text-[#FFD700] transition-colors leading-tight"
            style={{ fontFamily: DISPLAY }}
          >
            {item.title}
          </h3>
          <p className="mt-3 text-sm sm:text-base text-zinc-300/90 leading-relaxed line-clamp-2">
            {item.description}
          </p>
        </div>
      </div>
    </Link>
  )
}

function StoryPosterCard({ item }: { item: EditorialCard }) {
  const image = item.coverImage ?? item.moviePoster ?? item.actorImage ?? null

  return (
    <Link
      href={item.href}
      scroll={false}
      className="group flex flex-col overflow-hidden rounded-md border border-white/[0.08] bg-[#141414] hover:border-[#FFD700]/25 transition-colors h-full"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, 320px"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <time
            dateTime={item.publishedAt}
            className="text-[10px] uppercase tracking-wider text-zinc-400"
          >
            {formatDate(item.publishedAt)}
          </time>
          <h3
            className="mt-1 text-base sm:text-lg font-semibold text-white group-hover:text-[#FFD700] transition-colors leading-snug line-clamp-3"
            style={{ fontFamily: DISPLAY }}
          >
            {item.title}
          </h3>
        </div>
      </div>
    </Link>
  )
}
