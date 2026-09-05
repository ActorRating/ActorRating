"use client"

/**
 * Live “Just rated” ticker — polls recent community ratings and scrolls them.
 */

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { RecentRatingFeedItem } from "@/lib/recent-ratings-feed"
import { upgradePosterThumbRes } from "@/components/poster/PosterRails"

const POLL_MS = 15_000
const SANS: React.CSSProperties = {
  fontFamily: "var(--font-geist-sans), var(--font-sans), system-ui, sans-serif",
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setReduce(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return reduce
}

function mergeFeed(
  prev: RecentRatingFeedItem[],
  next: RecentRatingFeedItem[],
): RecentRatingFeedItem[] {
  if (next.length === 0) return prev
  const ordered: RecentRatingFeedItem[] = []
  const seen = new Set<string>()
  for (const item of next) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    ordered.push(item)
  }
  for (const item of prev) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    ordered.push(item)
  }
  return ordered.slice(0, 32)
}

function Chip({ item }: { item: RecentRatingFeedItem }) {
  const thumb =
    upgradePosterThumbRes(item.posterUrl) ??
    upgradePosterThumbRes(item.actorImageUrl) ??
    item.posterUrl ??
    item.actorImageUrl
  const year = item.movieYear > 0 ? ` (${item.movieYear})` : ""

  return (
    <Link
      href={item.rateHref}
      prefetch={false}
      className="group inline-flex shrink-0 items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] pl-1.5 pr-3.5 py-1.5 transition-colors hover:border-[#FFD700]/35 hover:bg-white/[0.06]"
    >
      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/[0.1] bg-zinc-900">
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            fill
            className="object-cover"
            sizes="32px"
          />
        ) : null}
      </span>
      <span className="min-w-0 text-left">
        <span className="block truncate text-[13px] font-medium text-white/90 group-hover:text-white max-w-[14rem] sm:max-w-[18rem]">
          {item.actorName}
          <span className="text-zinc-500"> · </span>
          <span className="text-zinc-400">
            {item.movieTitle}
            {year}
          </span>
        </span>
      </span>
      <span className="shrink-0 tabular-nums text-sm font-semibold text-[#FFD700]">
        {item.weightedScore.toFixed(1)}
      </span>
    </Link>
  )
}

export function LastRatedStrip() {
  const [items, setItems] = useState<RecentRatingFeedItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const reduceMotion = usePrefersReducedMotion()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch("/api/ratings/recent", { cache: "no-store" })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { items?: RecentRatingFeedItem[] }
        const next = Array.isArray(data.items) ? data.items : []
        if (cancelled) return
        setItems((prev) => mergeFeed(prev, next))
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }

    load()
    const id = window.setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  if (!loaded || items.length === 0) return null

  const loop = reduceMotion ? items : [...items, ...items]

  return (
    <section
      className="border-y border-white/[0.06] bg-black py-5 sm:py-6"
      aria-label="Just rated"
      style={SANS}
    >
      <div className="px-5 sm:px-8 mb-3.5 sm:mb-4 flex items-center gap-3">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FFD700]/70 shrink-0">
          Just rated
        </p>
        <span className="h-px flex-1 bg-white/[0.08]" aria-hidden />
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-600 shrink-0">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-[#FFD700] animate-pulse"
            aria-hidden
          />
          Live
        </span>
      </div>

      {reduceMotion ? (
        <div className="flex flex-wrap gap-2 px-5 sm:px-8">
          {items.map((item) => (
            <Chip key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="group/marquee relative overflow-hidden">
          <div className="last-rated-marquee-track flex w-max gap-2.5 pl-5 sm:pl-8 group-hover/marquee:[animation-play-state:paused]">
            {loop.map((item, i) => (
              <Chip key={`${item.id}-${i}`} item={item} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
