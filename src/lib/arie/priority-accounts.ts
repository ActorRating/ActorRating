/**
 * X handles for Opportunity Score / Cost Governor (lowercase, no @).
 *
 * Distribution tiers come from ActorRating reply analytics (impressions / reply),
 * not “who matters in Hollywood.” Validation corpus VM1 is weighted the same way.
 *
 * Expand via ArieConfig later — keep changes rare during validation batches.
 */

/** Proven / strategic distribution channels (priorityAuthor = true). */
export const ARIE_PRIORITY_HANDLES = new Set([
  // ⭐⭐⭐⭐⭐ reply distribution
  "boinkbuzz",
  "chaoscrave",
  // ⭐⭐⭐⭐
  "filmupdates",
  "deadline",
  // ⭐⭐⭐
  "discussingfilm",
  "variety",
  "thr",
  "hollywoodreporter",
  // ⭐⭐ / credibility / utility
  "cinematweets_",
  "cinematweets",
  "imdb",
  "letterboxd",
  "indiewire",
  "ew",
  "empiremagazine",
  "theplaylist",
  "slashfilm",
  "collider",
])

/**
 * Soft rank for analytics / corpus docs (higher = stronger historical reply reach).
 * Does not replace Opportunity Score; used for docs + future tuning.
 */
export const ARIE_DISTRIBUTION_RANK: Record<string, number> = {
  boinkbuzz: 5,
  chaoscrave: 5,
  filmupdates: 4,
  deadline: 4,
  discussingfilm: 3,
  variety: 3,
  thr: 3,
  hollywoodreporter: 3,
  cinematweets: 2,
  cinematweets_: 2,
}

export function normalizeHandle(handle: string | null | undefined): string {
  if (!handle) return ""
  return handle.replace(/^@/, "").trim().toLowerCase()
}

export function isPriorityAuthor(handle: string | null | undefined): boolean {
  const h = normalizeHandle(handle)
  return Boolean(h) && ARIE_PRIORITY_HANDLES.has(h)
}

export function distributionRank(handle: string | null | undefined): number {
  const h = normalizeHandle(handle)
  return ARIE_DISTRIBUTION_RANK[h] ?? 0
}
