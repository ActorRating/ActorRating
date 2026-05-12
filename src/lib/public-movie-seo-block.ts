import { isAdultContentMovie, isAdultContentSlug } from "@/lib/adult-content-filter"
import { isJunkMovieSlug, isAllowedMovieSlug } from "@/lib/junk-movie-slugs"

/** Junk / adult titles excluded from public SEO (sitemap, rate pages, movie layout). */
export function isPublicSeoBlockedMovie(
  slug: string | null,
  title: string,
  genre: string | null,
  overview: string | null,
): boolean {
  if (slug && isAllowedMovieSlug(slug)) return false
  if (slug && isJunkMovieSlug(slug)) return true
  if (slug && isAdultContentSlug(slug)) return true
  if (isAdultContentMovie({ title, genre, overview })) return true
  return false
}
