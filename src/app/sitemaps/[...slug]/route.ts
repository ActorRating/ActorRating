import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdultContentMovie } from '@/lib/adult-content-filter'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://www.actorrating.com'
const MAX_URLS_PER_SITEMAP = 10000

/**
 * Dynamic sitemap route handler
 * Handles:
 * - /sitemaps/static.xml
 * - /sitemaps/actors.xml  
 * - /sitemaps/performances-1.xml, /sitemaps/performances-2.xml, etc.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params
    const path = slug.join('/')

    // Handle static sitemap
    if (path === 'static.xml') {
      return generateStaticSitemap()
    }

    // Handle actors sitemap
    if (path === 'actors.xml') {
      return await generateActorsSitemap()
    }

    // Handle movies sitemap
    if (path === 'movies.xml') {
      return await generateMoviesSitemap()
    }

    // Handle paginated performances sitemaps (performances-1.xml, performances-2.xml, etc.)
    const performancesMatch = path.match(/^performances-(\d+)\.xml$/)
    if (performancesMatch) {
      const pageNum = parseInt(performancesMatch[1], 10)
      return await generatePerformancesSitemap(pageNum)
    }

    return new NextResponse('Sitemap not found', { status: 404 })
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}

function generateStaticSitemap(): NextResponse {
  const urls = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/auth/signin`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/auth/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/oscars-2026`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ]

  const xml = generateSitemapXml(urls)
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}

async function generateActorsSitemap(): Promise<NextResponse> {
  // Only include actors with ≥1 rated performance (indexing is a reward for engagement)
  const actorIdsWithRatings = await prisma.rating.findMany({
    select: { actorId: true },
    distinct: ['actorId'],
  })
  const ids = actorIdsWithRatings.map((r) => r.actorId)
  if (ids.length === 0) {
    const xml = generateSitemapXml([])
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  }

  const actors = await prisma.actor.findMany({
    where: { id: { in: ids } },
    select: { slug: true, id: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })

  const urls = actors.map((actor) => ({
    url: `${BASE_URL}/actors/${actor.slug || actor.id}`,
    lastModified: actor.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const xml = generateSitemapXml(urls)
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}

async function generateMoviesSitemap(): Promise<NextResponse> {
  // Only include movies with ≥1 rated performance (engagement signal)
  const movieIdsWithEnoughRatings = await prisma.$queryRaw<Array<{ movieId: string }>>`
    SELECT "movieId"
    FROM "Rating"
    GROUP BY "movieId"
    HAVING COUNT(DISTINCT "actorId") >= 1
  `
  const ids = movieIdsWithEnoughRatings.map((r) => r.movieId)
  if (ids.length === 0) {
    const xml = generateSitemapXml([])
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  }

  const movies = await prisma.movie.findMany({
    where: { id: { in: ids } },
    select: {
      slug: true,
      id: true,
      updatedAt: true,
      title: true,
      genre: true,
      overview: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  const safeMovies = movies.filter(
    (m) => !isAdultContentMovie({ title: m.title, genre: m.genre, overview: m.overview })
  )

  const urls = safeMovies.map((movie) => ({
    url: `${BASE_URL}/movies/${movie.slug || movie.id}`,
    lastModified: movie.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const xml = generateSitemapXml(urls)
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}

async function generatePerformancesSitemap(pageNum: number): Promise<NextResponse> {
  if (pageNum < 1) {
    return new NextResponse('Invalid page number', { status: 400 })
  }

  const skip = (pageNum - 1) * MAX_URLS_PER_SITEMAP

  // Only include rate pages that have ≥1 rating (indexing is a reward for engagement)
  const ratedPairs = await prisma.rating.groupBy({
    by: ['actorId', 'movieId'],
    _max: { updatedAt: true },
  })

  const actorIds = [...new Set(ratedPairs.map((p) => p.actorId))]
  const movieIds = [...new Set(ratedPairs.map((p) => p.movieId))]

  const [actors, movies] = await Promise.all([
    prisma.actor.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, slug: true },
    }),
    prisma.movie.findMany({
      where: { id: { in: movieIds } },
      select: { id: true, slug: true, title: true, genre: true, overview: true },
    }),
  ])

  const actorMap = new Map(actors.map((a) => [a.id, a]))
  const movieMap = new Map(movies.map((m) => [m.id, m]))

  const uniqueCombinations: Array<{ url: string; lastModified: Date }> = []
  for (const p of ratedPairs) {
    const actor = actorMap.get(p.actorId)
    const movie = movieMap.get(p.movieId)
    if (!actor || !movie || !p._max.updatedAt) continue
    if (isAdultContentMovie(movie)) continue
    uniqueCombinations.push({
      url: `${BASE_URL}/rate/${movie.slug || movie.id}/${actor.slug || actor.id}`,
      lastModified: p._max.updatedAt,
    })
  }

  // Sort by lastModified desc for stable pagination
  uniqueCombinations.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
  const paginatedUrls = uniqueCombinations.slice(skip, skip + MAX_URLS_PER_SITEMAP)

  if (paginatedUrls.length === 0) {
    return new NextResponse('Sitemap page not found', { status: 404 })
  }

  const urls = paginatedUrls.map((item) => ({
    url: item.url,
    lastModified: item.lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const xml = generateSitemapXml(urls)
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}

function generateSitemapXml(urls: Array<{
  url: string
  lastModified: Date
  changeFrequency: string
  priority: number
}>): string {
  const urlEntries = urls
    .map((item) => {
      const lastMod = item.lastModified.toISOString().split('T')[0]
      return `  <url>
    <loc>${escapeXml(item.url)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${item.changeFrequency}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
