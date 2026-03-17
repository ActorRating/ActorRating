import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdultContentMovie, isAdultContentSlug } from '@/lib/adult-content-filter'
import { isJunkMovieSlug, isAllowedMovieSlug } from '@/lib/junk-movie-slugs'

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
  // Include actors with ≥1 rated performance OR ≥5 performances (matches layout indexability)
  const [actorIdsWithRatings, actorIdsWithFivePlusPerformances] = await Promise.all([
    prisma.rating.findMany({ select: { actorId: true }, distinct: ['actorId'] }),
    prisma.$queryRaw<Array<{ actorId: string }>>`
      SELECT p."actorId" FROM "Performance" p
      INNER JOIN "Movie" m ON p."movieId" = m.id
      WHERE m."isFeaturette" = false
      GROUP BY p."actorId" HAVING COUNT(*) >= 5
    `,
  ])
  const idsSet = new Set<string>([
    ...actorIdsWithRatings.map((r) => r.actorId),
    ...actorIdsWithFivePlusPerformances.map((r) => r.actorId),
  ])
  const ids = Array.from(idsSet)
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
  // Include movies with ≥1 rated performance OR ≥5 total performances (Performance table)
  const [movieIdsWithRatings, movieIdsWithFivePlusPerformances] = await Promise.all([
    prisma.$queryRaw<Array<{ movieId: string }>>`
      SELECT r."movieId"
      FROM "Rating" r
      INNER JOIN "Movie" m ON r."movieId" = m.id
      WHERE m."isFeaturette" = false
      GROUP BY r."movieId"
      HAVING COUNT(DISTINCT r."actorId") >= 1
    `,
    prisma.$queryRaw<Array<{ movieId: string }>>`
      SELECT p."movieId"
      FROM "Performance" p
      INNER JOIN "Movie" m ON p."movieId" = m.id
      WHERE m."isFeaturette" = false
      GROUP BY p."movieId"
      HAVING COUNT(*) >= 5
    `,
  ])
  const idsSet = new Set<string>([
    ...movieIdsWithRatings.map((r) => r.movieId),
    ...movieIdsWithFivePlusPerformances.map((r) => r.movieId),
  ])
  const ids = Array.from(idsSet)
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
    where: { id: { in: ids }, isFeaturette: false },
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

  const safeMovies = movies.filter((m) => {
    const slug = m.slug ?? m.id
    if (isAllowedMovieSlug(slug)) return true
    if (isJunkMovieSlug(slug)) return false
    if (isAdultContentSlug(slug)) return false
    if (isAdultContentMovie({ title: m.title, genre: m.genre, overview: m.overview })) return false
    return true
  })

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
  // Use DB-level pagination so we don't materialize all rated pairs for every page.
  const ratedPairs = await prisma.rating.groupBy({
    by: ['actorId', 'movieId'],
    _max: { updatedAt: true },
    orderBy: {
      _max: {
        updatedAt: 'desc',
      },
    },
    skip,
    take: MAX_URLS_PER_SITEMAP * 3,
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
      select: { id: true, slug: true, title: true, genre: true, overview: true, isFeaturette: true },
    }),
  ])

  const actorMap = new Map(actors.map((a) => [a.id, a]))
  const movieMap = new Map(movies.map((m) => [m.id, m]))

  const combinations: Array<{ url: string; lastModified: Date }> = []
  for (const p of ratedPairs) {
    const actor = actorMap.get(p.actorId)
    const movie = movieMap.get(p.movieId)
    if (!actor || !movie || !p._max.updatedAt || movie.isFeaturette) continue
    const movieSlug = movie.slug ?? movie.id
    if (isAllowedMovieSlug(movieSlug)) {
      combinations.push({
        url: `${BASE_URL}/rate/${movie.slug || movie.id}/${actor.slug || actor.id}`,
        lastModified: p._max.updatedAt,
      })
      continue
    }
    if (isJunkMovieSlug(movieSlug) || isAdultContentSlug(movieSlug)) continue
    if (isAdultContentMovie({ title: movie.title, genre: movie.genre, overview: movie.overview })) continue
    combinations.push({
      url: `${BASE_URL}/rate/${movie.slug || movie.id}/${actor.slug || actor.id}`,
      lastModified: p._max.updatedAt,
    })
  }

  // We already ordered by updatedAt DESC at the DB level.
  const urlsForPage = combinations.slice(0, MAX_URLS_PER_SITEMAP)

  // If this page ends up with no URLs (e.g. index overestimated due to filters),
  // return an empty but valid sitemap instead of 404 to avoid GSC errors.
  if (urlsForPage.length === 0) {
    const xml = generateSitemapXml([])
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  }

  const urls = urlsForPage.map((item) => ({
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
