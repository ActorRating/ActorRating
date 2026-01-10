import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://www.actorrating.com'
const MAX_URLS_PER_SITEMAP = 10000

/**
 * Main sitemap index route handler
 * Returns a sitemap index pointing to separate sitemaps
 * This structure is required for large sites with 26,000+ URLs
 */
export async function GET(request: NextRequest) {
  try {
    // Count unique actor-movie combinations (distinct performances)
    // We need to get this count to determine pagination
    const uniquePerformanceCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT ("actorId" || '-' || "movieId"))::bigint as count
      FROM "Performance"
    `
    const performanceCount = Number(uniquePerformanceCount[0]?.count || 0)

    // Calculate how many performance sitemaps we need
    const performanceSitemapCount = Math.max(1, Math.ceil(performanceCount / MAX_URLS_PER_SITEMAP))

    // Build sitemap index entries
    const sitemapEntries: string[] = [
      `  <sitemap>
    <loc>${escapeXml(`${BASE_URL}/sitemaps/static.xml`)}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>`,
      `  <sitemap>
    <loc>${escapeXml(`${BASE_URL}/sitemaps/actors.xml`)}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>`,
    ]

    // Add paginated performance sitemaps
    for (let i = 1; i <= performanceSitemapCount; i++) {
      sitemapEntries.push(`  <sitemap>
    <loc>${escapeXml(`${BASE_URL}/sitemaps/performances-${i}.xml`)}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>`)
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</sitemapindex>`

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Error generating sitemap index:', error)
    // Return a minimal sitemap index on error
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${escapeXml(`${BASE_URL}/sitemaps/static.xml`)}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${escapeXml(`${BASE_URL}/sitemaps/actors.xml`)}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
</sitemapindex>`
    return new NextResponse(fallbackXml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  }
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
