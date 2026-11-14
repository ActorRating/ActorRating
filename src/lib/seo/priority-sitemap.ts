/**
 * Priority sitemap path list (static subset) and sitemap-index ordering helpers.
 * Used by scripts/generate-sitemaps.ts and unit tests — no DB.
 */

import { HUB_ENABLED_SLUGS } from "@/lib/movie-best-performances/hub-allowlist"
import type { StaticSitemapUrl } from "@/lib/seo/static-sitemap-urls"

/**
 * Static pages called out for the priority child sitemap:
 * home, methodology, discover, craft dimensions, Odyssey hub.
 * (lists are added separately from content/lists.)
 */
export function listPriorityStaticSitemapPaths(): StaticSitemapUrl[] {
  const hubs: StaticSitemapUrl[] = HUB_ENABLED_SLUGS.map((slug) => ({
    path: `/movies/${slug}/best-performances`,
    changeFrequency: "hourly" as const,
    priority: 0.95,
  }))

  return [
    { path: "/", changeFrequency: "daily", priority: 1.0 },
    { path: "/methodology", changeFrequency: "monthly", priority: 0.9 },
    { path: "/discover", changeFrequency: "daily", priority: 0.95 },
    { path: "/craft/emotional-range", changeFrequency: "daily", priority: 0.75 },
    { path: "/craft/screen-presence", changeFrequency: "daily", priority: 0.75 },
    { path: "/craft/character-believability", changeFrequency: "daily", priority: 0.7 },
    { path: "/craft/technical-skill", changeFrequency: "daily", priority: 0.7 },
    { path: "/craft/chemistry-interaction", changeFrequency: "daily", priority: 0.7 },
    ...hubs,
  ]
}

export type SitemapIndexManifestCounts = {
  prioritySitemapCount?: number
  actorSitemapCount: number
  movieSitemapCount: number
  performanceSitemapCount: number
  listSitemapCount?: number
  storySitemapCount?: number
  newsSitemapCount?: number
}

/**
 * Child sitemap filenames in crawl-priority order for the sitemap index.
 * priority → performances → lists → stories → news → actors → movies,
 * then static.xml (still listed; no URLs removed from any existing sitemap).
 */
export function listSitemapIndexFilenames(
  counts: SitemapIndexManifestCounts,
): string[] {
  const out: string[] = []

  if ((counts.prioritySitemapCount ?? 0) > 0) {
    out.push("priority.xml")
  }

  for (let i = 1; i <= (counts.performanceSitemapCount || 0); i++) {
    out.push(`performances-${i}.xml`)
  }

  if ((counts.listSitemapCount ?? 0) > 0) out.push("lists.xml")
  if ((counts.storySitemapCount ?? 0) > 0) out.push("stories.xml")
  if ((counts.newsSitemapCount ?? 0) > 0) out.push("news.xml")

  for (let i = 1; i <= (counts.actorSitemapCount || 0); i++) {
    out.push(`actors-${i}.xml`)
  }
  for (let i = 1; i <= (counts.movieSitemapCount || 0); i++) {
    out.push(`movies-${i}.xml`)
  }

  // Keep static advertised; appended so the approved priority order stays first.
  out.push("static.xml")

  return out
}

/** Max YYYY-MM-DD from urlset lastmod tags; null if none. */
export function maxLastmodFromUrlsetXml(xml: string): string | null {
  const dates = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1].trim())
  if (dates.length === 0) return null
  let max = dates[0]
  for (const d of dates) {
    if (d > max) max = d
  }
  return max
}

/** Prefer per-file lastmod map; else fallback date (YYYY-MM-DD). */
export function resolveSitemapIndexLastmod(
  filename: string,
  lastmods: Record<string, string> | undefined,
  fallbackYmd: string,
): string {
  const fromMap = lastmods?.[filename]
  if (fromMap && /^\d{4}-\d{2}-\d{2}/.test(fromMap)) {
    return fromMap.slice(0, 10)
  }
  return fallbackYmd.slice(0, 10)
}
