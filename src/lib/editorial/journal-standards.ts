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
