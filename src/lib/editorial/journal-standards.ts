/** Minimum body length targets for site journal pieces (markdown body only). */
export const JOURNAL_MIN_STORY_WORDS = 220
export const JOURNAL_MIN_NEWS_WORDS = 180

export function countMarkdownWords(markdown: string): number {
  return markdown
    .replace(/^#+\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>#-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length
}

export function tmdbPoster(path: string): string {
  const clean = path.replace(/^\/+/, "")
  return `https://image.tmdb.org/t/p/w1280/${clean}`
}

/** TMDB file paths that must never be used as editorial covers (verified NSFW / non-poster). */
export const JOURNAL_BLOCKED_COVER_FILE_PATHS = new Set([
  // Gap-fill typo: pasted as "Minari/Aftersun" but is explicit adult content on TMDB CDN.
  "59X25MoRSOLoiOKhO5L6T35Fve2.jpg",
])

export function extractTmdbPosterFilePath(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/\/t\/p\/w\d+\/([^/?#]+\.(?:jpg|jpeg|png|webp))$/i)
  return match?.[1]?.toLowerCase() ?? null
}

export function isBlockedJournalCover(url: string | null | undefined): boolean {
  const filePath = extractTmdbPosterFilePath(url)
  if (!filePath) return false
  return JOURNAL_BLOCKED_COVER_FILE_PATHS.has(filePath)
}

/** Drop blocked covers so runtime can fall back to a related movie poster from the DB. */
export function sanitizeJournalCover(url: string | null | undefined): string | null {
  if (!url || isBlockedJournalCover(url)) return null
  return url
}

export function meetsJournalMinimum(kind: "story" | "news", bodyMarkdown: string): boolean {
  const n = countMarkdownWords(bodyMarkdown)
  return kind === "story" ? n >= JOURNAL_MIN_STORY_WORDS : n >= JOURNAL_MIN_NEWS_WORDS
}

const JOURNAL_MIN_PAD: Record<"story" | "news", string> = {
  story:
    "\n\n## Draft until proven\n\nIf you cannot cite a quiet scene for this card, treat the score as a draft — not a settled verdict.",
  news: "\n\n## Draft until proven\n\nQuick-rates are allowed. Unsettled numbers pretending to be final are not.",
}

/** Append a short standard block when generated cron copy lands just under the minimum. */
export function ensureJournalMinimum(kind: "story" | "news", bodyMarkdown: string): string {
  if (meetsJournalMinimum(kind, bodyMarkdown)) return bodyMarkdown
  return `${bodyMarkdown.trimEnd()}${JOURNAL_MIN_PAD[kind]}`
}
