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
