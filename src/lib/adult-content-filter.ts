/**
 * Category 1: Explicit Adult Content filter
 * Used to exclude from sitemaps and to remove from DB:
 * - Any movie with "sex", "voyeur", "massage", or "erotic" in the title
 * - Softcore/adult films: "adult" or "erotic" in genre (not in title, to avoid "Young Adult")
 * - Erotic thrillers categorized as adult entertainment (genre)
 */

const TITLE_KEYWORDS = ['sex', 'voyeur', 'massage', 'erotic'] as const
const GENRE_KEYWORDS = ['sex', 'voyeur', 'massage', 'adult', 'erotic'] as const

function normalizeForMatch(text: string | null | undefined): string {
  if (text == null || text === '') return ''
  return text.toLowerCase().trim()
}

/**
 * Returns true if the given text contains any of the given keywords.
 */
function containsAny(text: string | null | undefined, keywords: readonly string[]): boolean {
  const normalized = normalizeForMatch(text)
  if (!normalized) return false
  return keywords.some((kw) => normalized.includes(kw))
}

/**
 * Returns true if the given text (e.g. movie title, genre) contains
 * any of the adult keywords. For title-only checks use TITLE_KEYWORDS logic.
 */
export function textContainsAdultKeyword(text: string | null | undefined): boolean {
  return containsAny(text, GENRE_KEYWORDS)
}

/**
 * Returns true if a movie should be treated as explicit adult content and
 * excluded from sitemaps / removed from indexed pages.
 * - Title: sex, voyeur, massage, erotic (no "adult" in title to avoid "Young Adult")
 * - Genre: sex, voyeur, massage, adult, erotic (softcore/adult categorization)
 */
export function isAdultContentMovie(movie: {
  title: string
  genre?: string | null
  overview?: string | null
}): boolean {
  if (containsAny(movie.title, TITLE_KEYWORDS)) return true
  if (containsAny(movie.genre, GENRE_KEYWORDS)) return true
  return false
}

export { TITLE_KEYWORDS, GENRE_KEYWORDS as ADULT_KEYWORDS }
