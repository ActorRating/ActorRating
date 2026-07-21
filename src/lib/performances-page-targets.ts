/** Shared targets for the performances page and prefetch (e.g. from landing). */

export type PerformanceTarget = {
  actor: string
  movie: string
  character?: string
  year?: number
  posterPath?: string
}

/** Landing carousel 1 — Popular Right Now */
export const POPULAR_RIGHT_NOW_TARGETS: PerformanceTarget[] = [
  { actor: "Matt Damon", movie: "The Odyssey", character: "Odysseus", year: 2026, posterPath: "/5rhTDKUhPYvpdQIijFIs5VoWsON.jpg" },
  { actor: "Cillian Murphy", movie: "Oppenheimer", character: "J. Robert Oppenheimer", year: 2023, posterPath: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg" },
  { actor: "Timothée Chalamet", movie: "Dune: Part Two", character: "Paul Atreides", year: 2024, posterPath: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg" },
  { actor: "Heath Ledger", movie: "The Dark Knight", character: "Joker", year: 2008, posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
  { actor: "Matthew McConaughey", movie: "Interstellar", character: "Cooper", year: 2014, posterPath: "/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg" },
  { actor: "J.K. Simmons", movie: "Whiplash", character: "Terence Fletcher", year: 2014, posterPath: "/7fn624j5lj3xTme2SgiLCeuedmO.jpg" },
  { actor: "Brad Pitt", movie: "Fight Club", character: "Tyler Durden", year: 1999, posterPath: "/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg" },
  { actor: "Joaquin Phoenix", movie: "Joker", character: "Joker", year: 2019, posterPath: "/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg" },
]

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

/** Landing carousel 3 — Recent Favorites */
export const RECENT_FAVORITES_TARGETS: PerformanceTarget[] = [
  { actor: "Demi Moore", movie: "The Substance", character: "Elisabeth Sparkle", year: 2024, posterPath: "/uYJvxMWMb9W4zIY3cbM50sj3dpC.jpg" },
  { actor: "Emma Stone", movie: "Poor Things", character: "Bella Baxter", year: 2023, posterPath: "/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg" },
  { actor: "Colin Farrell", movie: "The Banshees of Inisherin", character: "Pádraic Súilleabháin", year: 2022, posterPath: "/4yFG6cSPaCaPhyJ1vtGOtMD1lgh.jpg" },
  { actor: "Paul Mescal", movie: "Aftersun", character: "Calum", year: 2022, posterPath: "/evKz85EKouVbIr51zy5fOtpNRPg.jpg" },
  { actor: "Austin Butler", movie: "Elvis", character: "Elvis Presley", year: 2022, posterPath: "/qBOKWqAFbveZ4ryjJJwbie6tXkQ.jpg" },
  { actor: "Leonardo DiCaprio", movie: "Killers of the Flower Moon", character: "Ernest Burkhart", year: 2023, posterPath: "/dB6Krk806zeqd0YNp2ngQ9zXteH.jpg" },
  { actor: "Timothée Chalamet", movie: "Dune: Part Two", character: "Paul Atreides", year: 2024, posterPath: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg" },
  { actor: "Greta Lee", movie: "Past Lives", character: "Nora Moon", year: 2023, posterPath: "/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg" },
]

/** @deprecated Prefer POPULAR_RIGHT_NOW_TARGETS — kept for existing imports */
export const HOME_LEADERBOARD_ROWS = POPULAR_RIGHT_NOW_TARGETS.map(
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

/** @deprecated Prefer RECENT_FAVORITES_TARGETS */
export const RECENT_PERFORMANCE_TARGETS = RECENT_FAVORITES_TARGETS.map(
  ({ actor, movie }) => ({ actor, movie }),
)

export function homeLeaderboardLookupTargets(): { actor: string; movie: string }[] {
  return POPULAR_RIGHT_NOW_TARGETS.map(({ actor, movie }) => ({ actor, movie }))
}

export function allLandingRailLookupTargets(): { actor: string; movie: string }[] {
  return [
    ...POPULAR_RIGHT_NOW_TARGETS,
    ...LEGENDARY_PERFORMANCE_TARGETS,
    ...RECENT_FAVORITES_TARGETS,
  ].map(({ actor, movie }) => ({ actor, movie }))
}

type LookupTarget = { actor: string; movie: string }

export function buildByLookupUrl(targets: LookupTarget[]): string {
  return `/api/performances/by-lookup?targets=${encodeURIComponent(JSON.stringify(targets))}`
}

const CACHE_KEY = 'performances-page-data'
const CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Prefetch performances page data and store in sessionStorage.
 * Call on hover over "Start Rating Now" so the page loads instantly.
 */
export function prefetchPerformancesPageData(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (raw) {
      const { timestamp } = JSON.parse(raw)
      if (Date.now() - timestamp < CACHE_TTL_MS) return // already fresh
    }
  } catch {
    // ignore
  }

  const targets = [...RECENT_PERFORMANCE_TARGETS, ...ICONIC_PERFORMANCE_TARGETS]
  fetch(buildByLookupUrl(targets), {
    cache: "force-cache",
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((data: { performances?: Array<{ actor?: { name: string }; movie?: { title: string } }> } | null) => {
      if (!data?.performances) return
      const recent = RECENT_PERFORMANCE_TARGETS
        .map((t) => data.performances?.find((p: any) => p.actor?.name === t.actor && p.movie?.title === t.movie))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
      const iconic = ICONIC_PERFORMANCE_TARGETS
        .map((t) => data.performances?.find((p: any) => p.actor?.name === t.actor && p.movie?.title === t.movie))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data: { recent, iconic },
        timestamp: Date.now(),
      }))
    })
    .catch(() => {})
}
