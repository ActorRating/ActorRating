import type { ParsedEditorialDocument } from "@/lib/editorial/load-editorial"
import {
  extractTmdbPosterFilePath,
  isBlockedJournalCover,
  sanitizeJournalCover,
} from "@/lib/editorial/journal-standards"
import type { EnrichedListEntry } from "@/lib/lists/enrich-entries"

/** Actor-specific editorial stills — unique and on-topic for Odyssey-era pieces. */
export const ACTOR_EDITORIAL_ASSETS: Record<string, string> = {
  "tom-holland": "/editorial/tom-holland-telemachus-odyssey.jpg",
  zendaya: "/editorial/zendaya-athena-odyssey.jpg",
}

export function upgradePosterRes(url: string | null | undefined): string | null {
  if (!url) return null
  return url
    .replace("/t/p/w92/", "/t/p/w780/")
    .replace("/t/p/w154/", "/t/p/w780/")
    .replace("/t/p/w185/", "/t/p/w780/")
    .replace("/t/p/w342/", "/t/p/w780/")
    .replace("/t/p/w500/", "/t/p/w780/")
    .replace("/t/p/w1280/", "/t/p/w780/")
}

/** Stable key for de-dupe (TMDB file path, editorial asset path, or full URL). */
export function normalizeCoverKey(url: string): string {
  const tmdb = extractTmdbPosterFilePath(url)
  if (tmdb) return `tmdb:${tmdb.toLowerCase()}`
  const clean = url.split("?")[0] ?? url
  if (clean.startsWith("/editorial/")) return clean
  return clean
}

function pushCandidate(out: string[], seen: Set<string>, raw: string | null | undefined): void {
  const upgraded =
    raw?.startsWith("/editorial/") ? raw : upgradePosterRes(raw) ?? raw
  const url = sanitizeJournalCover(upgraded)
  if (!url || isBlockedJournalCover(url)) return
  const key = normalizeCoverKey(url)
  if (seen.has(key)) return
  seen.add(key)
  out.push(url)
}

/**
 * Cover candidates in priority order: related movie posters (relevant), actor editorial
 * stills, then topic-specific frontmatter art.
 */
export function buildEditorialCoverCandidates(
  doc: ParsedEditorialDocument,
  enriched: EnrichedListEntry[],
): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  for (const row of enriched) {
    if (!row.exists) continue
    pushCandidate(out, seen, row.moviePosterUrl)
  }

  for (const row of enriched) {
    if (!row.exists) continue
    const asset = ACTOR_EDITORIAL_ASSETS[row.actorSlug]
    if (asset) pushCandidate(out, seen, asset)
  }

  if (doc.coverImage?.startsWith("/editorial/")) {
    pushCandidate(out, seen, doc.coverImage)
  }

  if (doc.coverImage && !doc.coverImage.startsWith("/editorial/")) {
    pushCandidate(out, seen, doc.coverImage)
  }

  return out
}

export function pickUniqueCover(
  candidates: string[],
  usedKeys: Set<string>,
): string | null {
  for (const url of candidates) {
    const key = normalizeCoverKey(url)
    if (!usedKeys.has(key)) return url
  }
  return null
}

/** Article hero: best relevant cover, no index de-dupe. */
export function pickEditorialHeroCover(
  doc: ParsedEditorialDocument,
  enriched: EnrichedListEntry[],
): string | null {
  return buildEditorialCoverCandidates(doc, enriched)[0] ?? null
}
