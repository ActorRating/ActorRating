/** Shared targets for the performances page and prefetch (e.g. from landing). */

import {
  DAILY_RAIL_COUNT,
  POPULAR_RIGHT_NOW_POOL,
  RECENT_FAVORITES_POOL,
  popularRightNowTargets,
  recentFavoritesTargets,
  utcDateKey,
  type PerformanceTarget,
} from "@/lib/daily-rail-picks"

export type { PerformanceTarget }

export {
  DAILY_RAIL_COUNT,
  POPULAR_RIGHT_NOW_POOL,
  RECENT_FAVORITES_POOL,
  popularRightNowTargets,
  recentFavoritesTargets,
  utcDateKey,
}

/** Landing carousel 1 — Popular Right Now (today's UTC slice of the pool) */
export function popularRightNowLookupTargets(
  now?: Date,
): { actor: string; movie: string; year?: number }[] {
  return popularRightNowTargets(now).map(({ actor, movie, year }) => ({
    actor,
    movie,
    year,
  }))
}

/** Landing carousel 2 — Legendary Performances */
export const LEGENDARY_PERFORMANCE_TARGETS: PerformanceTarget[] = [
  { actor: "Daniel Day-Lewis", movie: "There Will Be Blood", character: "Daniel Plainview", year: 2007, posterPath: "/fa0RDkAlCec0STeMNAhPaF89q6U.jpg" },
  { actor: "Anthony Hopkins", movie: "The Silence of the Lambs", character: "Hannibal Lecter", year: 1991, posterPath: "/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg" },
  { actor: "Javier Bardem", movie: "No Country for Old Men", character: "Anton Chigurh", year: 2007, posterPath: "/uB7RDZby43Wvu8SKGHHTwGyTDBX.jpg" },
  { actor: "Robert De Niro", movie: "Taxi Driver", character: "Travis Bickle", year: 1976, posterPath: "/ekstpH614fwDX8DUln1a2Opz0N8.jpg" },
  { actor: "Al Pacino", movie: "The Godfather Part II", character: "Michael Corleone", year: 1974, posterPath: "/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg" },
  { actor: "Liam Neeson", movie: "Schindler's List", character: "Oskar Schindler", year: 1993, posterPath: "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg" },
  { actor: "Jack Nicholson", movie: "One Flew Over the Cuckoo's Nest", character: "Randle McMurphy", year: 1975, posterPath: "/kjWsMh72V6d8KRLV4EOoSJLT1H7.jpg" },
  { actor: "Tim Robbins", movie: "The Shawshank Redemption", character: "Andy Dufresne", year: 1994, posterPath: "/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg" },
]

/** @deprecated Prefer popularRightNowTargets() — today's slice, not the full pool */
export const POPULAR_RIGHT_NOW_TARGETS = POPULAR_RIGHT_NOW_POOL

/** @deprecated Prefer recentFavoritesTargets() — today's slice, not the full pool */
export const RECENT_FAVORITES_TARGETS = RECENT_FAVORITES_POOL

/** @deprecated Prefer POPULAR_RIGHT_NOW_POOL — kept for existing imports */
export const HOME_LEADERBOARD_ROWS = POPULAR_RIGHT_NOW_POOL.map(
  ({ actor, movie, year }) => ({
    actor,
    movie,
    year: year != null ? String(year) : undefined,
  }),
)

/** @deprecated Prefer LEGENDARY_PERFORMANCE_TARGETS */
export const ICONIC_PERFORMANCE_TARGETS = LEGENDARY_PERFORMANCE_TARGETS.map(
  ({ actor, movie }) => ({ actor, movie }),
)

/** @deprecated Prefer RECENT_FAVORITES_POOL */
export const RECENT_PERFORMANCE_TARGETS = RECENT_FAVORITES_POOL.map(
  ({ actor, movie }) => ({ actor, movie }),
)

export function homeLeaderboardLookupTargets(
  now?: Date,
): { actor: string; movie: string; year?: number }[] {
  return popularRightNowLookupTargets(now)
}

export function allLandingRailLookupTargets(
  now?: Date,
): { actor: string; movie: string; year?: number }[] {
  return [
    ...popularRightNowTargets(now),
    ...LEGENDARY_PERFORMANCE_TARGETS,
    ...recentFavoritesTargets(now),
  ].map(({ actor, movie, year }) => ({ actor, movie, year }))
}

type LookupTarget = { actor: string; movie: string }

export function buildByLookupUrl(targets: LookupTarget[]): string {
  return `/api/performances/by-lookup?targets=${encodeURIComponent(JSON.stringify(targets))}`
}

const CACHE_KEY = 'performances-page-data'
const CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Prefetch performances page data and store in sessionStorage.
 * Call on hover over Discover / Start rating so the page loads instantly.
 */
export function prefetchPerformancesPageData(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (raw) {
      const { timestamp, dateKey } = JSON.parse(raw)
      if (dateKey === utcDateKey() && Date.now() - timestamp < CACHE_TTL_MS) return
    }
  } catch {
    // ignore
  }

  fetch("/api/performances/landing-rails", { cache: "force-cache" })
    .then((r) => (r.ok ? r.json() : null))
    .then((data: {
      dateKey?: string
      popular?: unknown[]
      legendary?: unknown[]
      recent?: unknown[]
    } | null) => {
      if (!data?.popular && !data?.legendary && !data?.recent) return
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data: {
            popular: data.popular ?? [],
            legendary: data.legendary ?? [],
            recent: data.recent ?? [],
          },
          dateKey: data.dateKey ?? utcDateKey(),
          timestamp: Date.now(),
        }),
      )
    })
    .catch(() => {})
}
