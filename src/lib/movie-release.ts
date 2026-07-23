/**
 * Release-day gating for ratings.
 * A movie is rateable on its release calendar day (inclusive) and after.
 */

function toDateOnlyUtc(d: Date): string {
  // YYYY-MM-DD in UTC — stable across SSR/client.
  return d.toISOString().slice(0, 10)
}

/** Parse TMDB `YYYY-MM-DD` (or Date) into a Date at UTC midnight, or null. */
export function parseTmdbReleaseDate(
  value?: string | Date | null
): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return null
    const iso = toDateOnlyUtc(value)
    return new Date(`${iso}T00:00:00.000Z`)
  }
  const m = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const iso = `${m[1]}-${m[2]}-${m[3]}`
  const d = new Date(`${iso}T00:00:00.000Z`)
  return Number.isFinite(d.getTime()) ? d : null
}

export function isMovieReleased(
  movie: {
    releaseDate?: string | Date | null
    year?: number | null
  },
  now: Date = new Date()
): boolean {
  const today = toDateOnlyUtc(now)
  const release = parseTmdbReleaseDate(movie.releaseDate ?? null)
  if (release) {
    return toDateOnlyUtc(release) <= today
  }
  // No exact date yet: future years are coming soon; current/past years stay rateable.
  const year = typeof movie.year === "number" ? movie.year : null
  if (year != null && Number.isFinite(year)) {
    return year <= Number(today.slice(0, 4))
  }
  return true
}

export function isMovieComingSoon(
  movie: {
    releaseDate?: string | Date | null
    year?: number | null
  },
  now: Date = new Date()
): boolean {
  return !isMovieReleased(movie, now)
}
