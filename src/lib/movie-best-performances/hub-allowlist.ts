/**
 * Best-performances hubs are intentionally scarce — only allowlisted film
 * slugs get an indexable hub page. Everything else must 404 with no DB work.
 */
export const HUB_ENABLED_SLUGS = ["the-odyssey-2026"] as const

const ENABLED = new Set<string>(HUB_ENABLED_SLUGS)

export function isHubEnabledSlug(slug: string): boolean {
  return ENABLED.has(slug)
}
