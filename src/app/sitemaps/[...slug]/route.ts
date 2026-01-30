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
  // Only include actors that have at least one performance (rate page)
  const actors = await prisma.actor.findMany({
    where: { performances: { some: {} } },
    select: {
      slug: true,
      id: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
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
  // Only include movies that have at least one performance (rate page)
  const movies = await prisma.movie.findMany({
    where: { performances: { some: {} } },
    select: {
      slug: true,
      id: true,
      updatedAt: true,
      title: true,
      genre: true,
      overview: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
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

  // Get all performances with movie title/genre/overview for adult-content filter
  const allPerformances = await prisma.performance.findMany({
    select: {
      actor: {
        select: {
          slug: true,
          id: true,
        },
      },
      movie: {
        select: {
          slug: true,
          id: true,
          title: true,
          genre: true,
          overview: true,
        },
      },
      updatedAt: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  // Deduplicate by actor-movie combination; exclude adult-content movies
  const uniqueCombinations = new Map<string, {
    url: string
    lastModified: Date
  }>()

  for (const perf of allPerformances) {
    if (isAdultContentMovie(perf.movie)) continue
    const key = `${perf.actor.id}-${perf.movie.id}`
    const url = `${BASE_URL}/rate/${perf.movie.slug || perf.movie.id}/${perf.actor.slug || perf.actor.id}`
    
    const existing = uniqueCombinations.get(key)
    if (!existing || perf.updatedAt > existing.lastModified) {
      uniqueCombinations.set(key, {
        url,
        lastModified: perf.updatedAt,
      })
    }
  }

  // Convert to array and paginate
  const allUrls = Array.from(uniqueCombinations.values())
  const paginatedUrls = allUrls.slice(skip, skip + MAX_URLS_PER_SITEMAP)

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
