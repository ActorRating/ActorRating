/**
 * Priority X handles for Opportunity Score / Cost Governor (lowercase, no @).
 * Expand via ArieConfig later — frozen list for Sprint 2.
 */
export const ARIE_PRIORITY_HANDLES = new Set([
  "deadline",
  "variety",
  "thr",
  "hollywoodreporter",
  "filmupdates",
  "imdb",
  "letterboxd",
  "indiewire",
  "ew",
  "empiremagazine",
  "theplaylist",
  "slashfilm",
  "collider",
  "netflixfilm",
  "a24",
  "searchlightpics",
  "universalpics",
  "warnerbros",
  "paramountpics",
])

export function isPriorityAuthor(handle: string | null | undefined): boolean {
  if (!handle) return false
  const h = handle.replace(/^@/, "").trim().toLowerCase()
  return ARIE_PRIORITY_HANDLES.has(h)
}
