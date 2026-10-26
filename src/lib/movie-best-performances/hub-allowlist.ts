/**
 * Best-performances hubs are intentionally scarce — only allowlisted film
 * slugs get an indexable hub page. Everything else must 404 with no DB work.
 */
export const HUB_ENABLED_SLUGS = ["the-odyssey-2026"] as const

const ENABLED = new Set<string>(HUB_ENABLED_SLUGS)

export function isHubEnabledSlug(slug: string): boolean {
  return ENABLED.has(slug)
}

/** `/movies/{slug}/best-performances` when allowlisted; otherwise null. */
export function hubBestPerformancesPath(slug: string): string | null {
  if (!isHubEnabledSlug(slug)) return null
  return `/movies/${slug}/best-performances`
}

/**
 * First allowlisted hub path found in already-loaded filmography (no DB).
 * Used by the actor crawl shell so cast members of hub films link to the hub.
 */
export function findHubPathInFilmography(
  movies: Array<{ slug?: string | null }>,
): string | null {
  for (const movie of movies) {
    const slug = movie.slug?.trim()
    if (!slug) continue
    const path = hubBestPerformancesPath(slug)
    if (path) return path
  }
  return null
}
