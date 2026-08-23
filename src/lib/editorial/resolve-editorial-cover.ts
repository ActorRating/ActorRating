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

/** Italicized *Title* and "Title" mentions in editorial copy. */
export function extractMentionedTitles(text: string): string[] {
  const titles: string[] = []
  const seen = new Set<string>()
  const add = (t: string) => {
    const clean = t.replace(/\*$/g, "").trim()
    if (clean.length < 2 || seen.has(clean.toLowerCase())) return
    seen.add(clean.toLowerCase())
    titles.push(clean)
  }

  for (const m of text.matchAll(/\*([^*]{2,80})\*/g)) add(m[1] ?? "")
  for (const m of text.matchAll(/"([^"]{2,80})"/g)) add(m[1] ?? "")
  for (const m of text.matchAll(/(?:^|[.!?]\s+)([A-Z][^.\n!?]{2,60})\s+(?:\(\d{4}\))/gm)) add(m[1] ?? "")

  return titles
}

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, "")
}

function titleMatchesMovie(mention: string, movieTitle: string): boolean {
  const a = normalizeTitleKey(mention)
  const b = normalizeTitleKey(movieTitle)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

/** Order related rows: mentioned in title/description/body first, then frontmatter order. */
export function orderRelatedByRelevance(
  doc: ParsedEditorialDocument,
  enriched: EnrichedListEntry[],
): EnrichedListEntry[] {
  const exists = enriched.filter((r) => r.exists)
  if (exists.length <= 1) return exists

  const mentionText = [doc.title, doc.description, doc.bodyMarkdown.slice(0, 1200)].join("\n")
  const mentions = extractMentionedTitles(mentionText)

  const scored = exists.map((row, index) => {
    let score = exists.length - index
    for (let i = 0; i < mentions.length; i++) {
      if (titleMatchesMovie(mentions[i]!, row.movieTitle)) {
        score += (mentions.length - i) * 20
      }
    }
    return { row, score, index }
  })

  scored.sort((a, b) => b.score - a.score || a.index - b.index)
  return scored.map((s) => s.row)
}

/**
 * Cover candidates: posters for movies referenced in the piece (related + mentions),
 * then actor editorial stills. Ignores unrelated frontmatter TMDB URLs.
 */
export function buildEditorialCoverCandidates(
  doc: ParsedEditorialDocument,
  enriched: EnrichedListEntry[],
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const ordered = orderRelatedByRelevance(doc, enriched)

  for (const row of ordered) {
    pushCandidate(out, seen, row.moviePosterUrl)
  }

  for (const row of ordered) {
    const asset = ACTOR_EDITORIAL_ASSETS[row.actorSlug]
    if (asset) pushCandidate(out, seen, asset)
  }

  if (doc.coverImage?.startsWith("/editorial/")) {
    pushCandidate(out, seen, doc.coverImage)
  }

  // Last resort for index de-dupe: topic-specific frontmatter art (still sanitized).
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

/** Article hero: poster for the movie this piece is about (never unrelated frontmatter). */
export function pickEditorialHeroCover(
  doc: ParsedEditorialDocument,
  enriched: EnrichedListEntry[],
): string | null {
  for (const row of orderRelatedByRelevance(doc, enriched)) {
    const poster = sanitizeJournalCover(
      upgradePosterRes(row.moviePosterUrl) ?? row.moviePosterUrl,
    )
    if (poster) return poster
  }
  if (doc.coverImage?.startsWith("/editorial/")) {
    return sanitizeJournalCover(doc.coverImage)
  }
  return null
}
