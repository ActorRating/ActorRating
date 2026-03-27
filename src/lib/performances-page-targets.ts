/** Shared targets for the performances page and prefetch (e.g. from landing). */

export const RECENT_PERFORMANCE_TARGETS = [
  { actor: "Timothée Chalamet", movie: "Dune: Part Two" },
  { actor: "Zendaya", movie: "Challengers" },
  { actor: "Cillian Murphy", movie: "Oppenheimer" },
  { actor: "Emma Stone", movie: "Poor Things" },
  { actor: "Austin Butler", movie: "Elvis" },
  { actor: "Margot Robbie", movie: "Barbie" },
]

export const ICONIC_PERFORMANCE_TARGETS = [
  { actor: "Heath Ledger", movie: "The Dark Knight" },
  { actor: "Al Pacino", movie: "The Godfather Part II" },
  { actor: "Marlon Brando", movie: "The Godfather" },
  { actor: "Leonardo DiCaprio", movie: "The Wolf of Wall Street" },
  { actor: "Robert De Niro", movie: "Taxi Driver" },
  { actor: "Anthony Hopkins", movie: "The Silence of the Lambs" },
]

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
