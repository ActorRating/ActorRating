/**
 * Known meaningless/junk movie slugs — return 410 for these URLs.
 * Add slugs here when you want to remove them from the site.
 */
export const JUNK_MOVIE_SLUGS = new Set([
  "chilli-and-banana-2021",
  "strange-housekeeper-2021",
])

export function isJunkMovieSlug(slug: string): boolean {
  return JUNK_MOVIE_SLUGS.has(slug.toLowerCase())
}
