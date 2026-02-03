/**
 * Known meaningless/junk movie slugs — return 410 for these URLs.
 * Add slugs here when you want to remove them from the site.
 */
export const JUNK_MOVIE_SLUGS = new Set([
  "chilli-and-banana-2021",
  "strange-housekeeper-2021",
  // Adult/junk content (explicit blocklist)
  "yokubo-no-sakaba-nure-niyou-iro-onna-2010",
  "my-brother-wants-to-hide-the-food-but-not-the-lady-2020",
  "step-mom-2024",
  "lady-next-door-penetrated-indiscriminately-2024",
  "heavens-gate-boksangsa-temple-2021",
  "kiss-room-between-the-lips-2025",
  "swapping-invited-male-and-female-2021",
  "lesbian-in-mourning-clothes-shameful-mother-and-widow-2005",
  "dirty-wife-2020",
])

/** Slugs that are never treated as junk/adult (legitimate films that match keyword filters). */
export const ALLOWED_MOVIE_SLUGS = new Set(["the-naked-gun-2025"])

export function isJunkMovieSlug(slug: string): boolean {
  return JUNK_MOVIE_SLUGS.has(slug.toLowerCase())
}

export function isAllowedMovieSlug(slug: string | null | undefined): boolean {
  return slug != null && ALLOWED_MOVIE_SLUGS.has(slug.toLowerCase())
}
