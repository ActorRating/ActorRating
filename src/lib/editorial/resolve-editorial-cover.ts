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

export type CoverCandidate = { url: string; key: string }

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

export function upgradeActorImageRes(url: string | null | undefined): string | null {
  if (!url) return null
  return url
    .replace("/t/p/w45/", "/t/p/w500/")
    .replace("/t/p/w185/", "/t/p/w500/")
    .replace("/t/p/w342/", "/t/p/w500/")
}

/** Stable key for de-dupe (TMDB poster path, editorial asset, or actor slug). */
export function normalizeCoverKey(url: string, actorSlug?: string): string {
  if (actorSlug) return `actor:${actorSlug}`
  const tmdb = extractTmdbPosterFilePath(url)
  if (tmdb) return `tmdb:${tmdb.toLowerCase()}`
  const clean = url.split("?")[0] ?? url
  if (clean.startsWith("/editorial/")) return clean
  return clean
}

function pushCandidate(
  out: CoverCandidate[],
  seen: Set<string>,
  raw: string | null | undefined,
  actorSlug?: string,
): void {
  const upgraded = raw?.startsWith("/editorial/")
    ? raw
    : actorSlug
      ? upgradeActorImageRes(raw) ?? upgradePosterRes(raw) ?? raw
      : upgradePosterRes(raw) ?? raw
  const url = sanitizeJournalCover(upgraded)
  if (!url || isBlockedJournalCover(url)) return
  const key = normalizeCoverKey(url, actorSlug)
  if (seen.has(key)) return
  seen.add(key)
  out.push({ url, key })
}

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

function normalizeNameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ")
}

function nameMatchesMention(mention: string, actorName: string): boolean {
  const a = normalizeNameKey(mention)
  const b = normalizeNameKey(actorName)
  if (!a || !b) return false
  return a.includes(b) || b.includes(a)
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

/** Actor-led when the title/description foregrounds a performer over a film title. */
export function isActorLedPiece(
  doc: ParsedEditorialDocument,
  primary: EnrichedListEntry | undefined,
): boolean {
  if (!primary?.actorName) return false
  const actor = primary.actorName.toLowerCase()
  const title = doc.title.toLowerCase()
  const desc = doc.description.toLowerCase()

  if (title.startsWith(actor) || title.includes(`${actor}'s`)) {
    return true
  }

  const lastName = actor.split(/\s+/).pop()
  if (lastName && lastName.length > 2 && title.includes(lastName)) {
    const titleMovies = extractMentionedTitles(doc.title)
    if (titleMovies.length === 0 || !titleMovies.some((m) => titleMatchesMovie(m, primary.movieTitle))) {
      return true
    }
  }

  const firstName = actor.split(/\s+/)[0]
  if (firstName && firstName.length > 2 && title.startsWith(firstName)) return true

  if (title.includes(actor) && title.includes(" in ")) return true

  const titleMovies = extractMentionedTitles(doc.title)
  if (desc.includes(actor) && !titleMovies.some((m) => titleMatchesMovie(m, primary.movieTitle))) {
    return true
  }

  return false
}

export function orderRelatedByRelevance(
  doc: ParsedEditorialDocument,
  enriched: EnrichedListEntry[],
): EnrichedListEntry[] {
  const exists = enriched.filter((r) => r.exists)
  if (exists.length <= 1) return exists

  const mentionText = [doc.title, doc.description, doc.bodyMarkdown.slice(0, 1200)].join("\n")
  const movieMentions = extractMentionedTitles(mentionText)

  const scored = exists.map((row, index) => {
    let score = exists.length - index
    for (let i = 0; i < movieMentions.length; i++) {
      if (titleMatchesMovie(movieMentions[i]!, row.movieTitle)) {
        score += (movieMentions.length - i) * 20
      }
    }
    if (nameMatchesMention(doc.title, row.actorName)) score += 50
    if (nameMatchesMention(doc.description, row.actorName)) score += 25
    return { row, score, index }
  })

  scored.sort((a, b) => b.score - a.score || a.index - b.index)
  return scored.map((s) => s.row)
}

export function buildEditorialCoverCandidates(
  doc: ParsedEditorialDocument,
  enriched: EnrichedListEntry[],
): CoverCandidate[] {
  const out: CoverCandidate[] = []
  const seen = new Set<string>()
  const ordered = orderRelatedByRelevance(doc, enriched)
  const primary = ordered[0]
  const actorLed = isActorLedPiece(doc, primary)

  const addActorVisuals = () => {
    for (const row of ordered) {
      const asset = ACTOR_EDITORIAL_ASSETS[row.actorSlug]
      if (asset) pushCandidate(out, seen, asset)
      pushCandidate(out, seen, row.actorImageUrl, row.actorSlug)
    }
  }

  const addMoviePosters = () => {
    for (const row of ordered) {
      pushCandidate(out, seen, row.moviePosterUrl)
    }
  }

  if (actorLed) {
    addActorVisuals()
    addMoviePosters()
  } else {
    addMoviePosters()
    addActorVisuals()
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
  candidates: CoverCandidate[],
  usedKeys: Set<string>,
): string | null {
  for (const c of candidates) {
    if (!usedKeys.has(c.key)) return c.url
  }
  return candidates[0]?.url ?? null
}

export function pickUniqueCoverWithKey(
  candidates: CoverCandidate[],
  usedKeys: Set<string>,
): CoverCandidate | null {
  for (const c of candidates) {
    if (!usedKeys.has(c.key)) return c
  }
  return candidates[0] ?? null
}

export function pickEditorialHeroCover(
  doc: ParsedEditorialDocument,
  enriched: EnrichedListEntry[],
): string | null {
  return buildEditorialCoverCandidates(doc, enriched)[0]?.url ?? null
}
