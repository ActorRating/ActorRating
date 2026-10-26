/**
 * Canonical static sitemap URL list (no DB). Used by scripts/generate-sitemaps.ts
 * and unit tests so hub allowlist entries stay in sync with public/sitemaps/static.xml.
 */

import { HUB_ENABLED_SLUGS } from "@/lib/movie-best-performances/hub-allowlist"

export type StaticSitemapUrl = {
  path: string
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never"
  priority: number
}

/** Path-only entries (leading slash). Auth / search / bare /rate are excluded (noindex). */
export function listStaticSitemapPaths(): StaticSitemapUrl[] {
  const hubPaths: StaticSitemapUrl[] = HUB_ENABLED_SLUGS.map((slug) => ({
    path: `/movies/${slug}/best-performances`,
    changeFrequency: "hourly" as const,
    priority: 0.85,
  }))

  return [
    { path: "/", changeFrequency: "daily", priority: 1.0 },
    { path: "/about", changeFrequency: "monthly", priority: 0.8 },
    { path: "/methodology", changeFrequency: "monthly", priority: 0.8 },
    { path: "/lists", changeFrequency: "weekly", priority: 0.8 },
    { path: "/forum", changeFrequency: "daily", priority: 0.8 },
    { path: "/stories", changeFrequency: "weekly", priority: 0.8 },
    { path: "/news", changeFrequency: "weekly", priority: 0.8 },
    { path: "/discover", changeFrequency: "daily", priority: 0.9 },
    { path: "/craft/emotional-range", changeFrequency: "daily", priority: 0.7 },
    { path: "/craft/screen-presence", changeFrequency: "daily", priority: 0.7 },
    { path: "/craft/character-believability", changeFrequency: "daily", priority: 0.65 },
    { path: "/craft/technical-skill", changeFrequency: "daily", priority: 0.65 },
    { path: "/craft/chemistry-interaction", changeFrequency: "daily", priority: 0.65 },
    ...hubPaths,
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  ]
}

/** Absolute loc URLs for a given origin (no trailing slash on base). */
export function listStaticSitemapLocs(baseUrl: string): string[] {
  const base = baseUrl.replace(/\/$/, "")
  return listStaticSitemapPaths().map((e) =>
    e.path === "/" ? base : `${base}${e.path}`,
  )
}

/** Count of a specific path in the static list (should be 1 for each hub). */
export function countStaticSitemapPath(path: string): number {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return listStaticSitemapPaths().filter((e) => e.path === normalized).length
}
