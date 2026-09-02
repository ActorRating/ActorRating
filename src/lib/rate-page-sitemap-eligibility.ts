import { isAdultContentMovie, isAdultContentSlug } from "@/lib/adult-content-filter"
import { isJunkMovieSlug, isAllowedMovieSlug } from "@/lib/junk-movie-slugs"
import { isFeaturetteMovie } from "@/lib/non-rateable"
import { isMovieComingSoon, parseTmdbReleaseDate } from "@/lib/movie-release"

export type SitemapRateMovieInput = {
  slug: string | null
  id: string
  title: string
  genre: string | null
  overview: string | null
  isFeaturette?: boolean | null
  releaseDate?: Date | string | null
  year?: number | null
}

function shouldIncludeMovie(movie: {
  slug: string | null
  id: string
  title: string
  genre: string | null
  overview: string | null
}): boolean {
  const slug = movie.slug ?? movie.id
  if (isAllowedMovieSlug(slug)) return true
  if (isJunkMovieSlug(slug) || isAdultContentSlug(slug)) return false
  if (isAdultContentMovie({ title: movie.title, genre: movie.genre, overview: movie.overview })) {
    return false
  }
  return true
}

/**
 * Movie gates for /rate URLs in the performances sitemap (and admin “sitemapEligible”).
 * Shared so admin cohort-crossed and generate-sitemaps cannot drift.
 */
export function isSitemapEligibleRateMovie(movie: SitemapRateMovieInput): boolean {
  if (isFeaturetteMovie(movie)) return false
  if (isMovieComingSoon(movie)) return false
  // Same calendar year without a concrete releaseDate: keep out of the rate sitemap
  // until TMDB date is stored (avoids shipping noindex / unreleased /rate URLs).
  const year = typeof movie.year === "number" ? movie.year : null
  if (
    year != null &&
    year === new Date().getUTCFullYear() &&
    !parseTmdbReleaseDate(movie.releaseDate ?? null)
  ) {
    return false
  }
  return shouldIncludeMovie(movie)
}
