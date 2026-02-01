/**
 * Movie page: /movies/[slug]
 * 410 Gone for removed/adult movies is handled in middleware (via API check).
 */

import MoviePageClient from './MoviePageClient'

export const dynamic = 'force-dynamic'

export default function MoviePage() {
  return <MoviePageClient />
}
