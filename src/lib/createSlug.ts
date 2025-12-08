/**
 * Utility for creating URL-friendly slugs from text
 * Handles special characters, accents, and ensures consistency
 */

export function createSlug(text: string): string {
  return text
    .toLowerCase()
    // Remove accents and diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace spaces and special characters with hyphens
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .trim()
    .replace(/^-+|-+$/g, '')
}

/**
 * Create a slug for an actor name
 * Example: "Christian Bale" -> "christian-bale"
 */
export function createActorSlug(name: string): string {
  return createSlug(name)
}

/**
 * Create a slug for a movie title with year
 * Example: "The Dark Knight (2008)" -> "the-dark-knight-2008"
 */
export function createMovieSlug(title: string, year?: number): string {
  const titleSlug = createSlug(title)
  if (year) {
    return `${titleSlug}-${year}`
  }
  return titleSlug
}

/**
 * Parse a movie slug back to title and year
 * Example: "the-dark-knight-2008" -> { title: "The Dark Knight", year: 2008 }
 */
export function parseMovieSlug(slug: string): { title: string; year?: number } {
  const yearMatch = slug.match(/-(\d{4})$/)
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10)
    const titleSlug = slug.replace(/-(\d{4})$/, '')
    const title = titleSlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    return { title, year }
  }
  const title = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  return { title }
}

