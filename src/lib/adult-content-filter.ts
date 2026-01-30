/**
 * Category 1: Explicit Adult Content filter
 * Used to exclude from sitemaps and to remove from DB:
 * - Any movie with "sex", "voyeur", "massage", or "erotic" in the title
 * - Softcore/adult films: "adult" or "erotic" in genre (not in title, to avoid "Young Adult")
 * - Erotic thrillers categorized as adult entertainment (genre)
 *
 * Subtle keywords (seduc, tempt, affair, etc.) are for manual review only — not auto-deleted.
 */

const TITLE_KEYWORDS = ['sex', 'voyeur', 'massage', 'erotic'] as const
const GENRE_KEYWORDS = ['sex', 'voyeur', 'massage', 'adult', 'erotic'] as const

/** Keywords that often indicate adult content; require manual review. Not used for auto-delete. */
export const SUBTLE_TITLE_KEYWORDS = [
  'seduc',
  'tempt',
  'affair',
  'obsess',
  'desire',
  'forbidden',
  'passion',
  'mistress',
] as const

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

/**
 * Returns true if the movie title contains any "subtle" adult keyword.
 * Used for listing candidates for manual review; not for auto-delete or sitemap exclusion.
 */
export function hasSubtleAdultKeyword(title: string | null | undefined): boolean {
  return containsAny(title, SUBTLE_TITLE_KEYWORDS)
}

export { TITLE_KEYWORDS, GENRE_KEYWORDS as ADULT_KEYWORDS }
