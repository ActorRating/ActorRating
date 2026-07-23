/**
 * Soft-gates for content that stays in the DB but must not appear in
 * actor filmographies, movie pages, or rate flows: featurettes/making-ofs
 * and Self / archive-footage credits.
 */

/** Title substrings (lowercase) that mark a movie as a featurette/making-of. */
export const FEATURETTE_TITLE_INCLUDES = [
  "making of",
  "making-of",
  "behind the scenes",
  "behind-the-scenes",
  "featurette",
  "deleted scenes",
  "bonus feature",
  "the style of",
  "recreating",
  "to the big screen",
  "oprah special",
  "special edition of",
  "a special edition",
  "tv special",
  "television special",
  "artists behind",
  "music & artists behind",
  "music and artists behind",
  "locations for",
] as const

const FEATURETTE_TITLE_REGEXES: RegExp[] = [
  /\ba\s+special\b/i,
  /\bspecial:\s/i,
  /\bexclusive(ly)?\b.*\bspecial\b/i,
]

export function matchesFeaturetteTitle(title?: string | null): boolean {
  const t = (title ?? "").toLowerCase().trim()
  if (!t) return false
  if (FEATURETTE_TITLE_INCLUDES.some((p) => t.includes(p))) return true
  return FEATURETTE_TITLE_REGEXES.some((re) => re.test(t))
}

export function isFeaturetteMovie(movie: {
  isFeaturette?: boolean | null
  title?: string | null
}): boolean {
  if (movie.isFeaturette) return true
  return matchesFeaturetteTitle(movie.title)
}

/**
 * Non-acting / documentary appearance credits.
 * Matches: Self, Self - …, Himself, Herself, Themselves, archive footage.
 * Avoids false positives like "Selfridge" (word-boundary after Self).
 */
export function isSelfOrArchiveCredit(character?: string | null): boolean {
  const raw = (character ?? "").trim()
  if (!raw) return false
  const c = raw.toLowerCase()
  if (/^(him|her|them)?self\b/.test(c)) return true
  if (/\barchive\s+footage\b/.test(c)) return true
  return false
}

/** True when this credit should be hidden from UI and blocked from rating. */
export function isNonRateablePerformance(input: {
  character?: string | null
  movie?: { isFeaturette?: boolean | null; title?: string | null } | null
}): boolean {
  if (isSelfOrArchiveCredit(input.character)) return true
  if (input.movie && isFeaturetteMovie(input.movie)) return true
  return false
}
