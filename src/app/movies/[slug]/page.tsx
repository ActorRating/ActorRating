/**
 * Movie page: /movies/[slug]
 * Prefetch movie data on the server for faster first paint.
 */

import MoviePageClient from './MoviePageClient'

export const dynamic = 'force-dynamic'

export default async function MoviePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
  if (isUUID) return <MoviePageClient />
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/movies/${slug}`, {
      next: { revalidate: 60 },
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return <MoviePageClient />
    const data = await res.json()
    return (
      <MoviePageClient
        initialMovie={data}
        initialPerformances={data.performances || []}
      />
    )
  } catch {
    return <MoviePageClient />
  }
}
