export const dynamic = "force-dynamic"

import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://actorrating.com'
const SITEMAPS_DIR = path.join(process.cwd(), 'public', 'sitemaps')

interface Manifest {
  generatedAt: string
  actorSitemapCount: number
  movieSitemapCount: number
  performanceSitemapCount: number
  listSitemapCount?: number
  storySitemapCount?: number
  newsSitemapCount?: number
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function sitemapEntry(loc: string, lastmod: string): string {
  return `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`
}

/** Only list chunk files that actually exist on disk (guards stale manifest counts). */
function existingChunkCount(prefix: string, claimed: number): number {
  let n = 0
  for (let i = 1; i <= claimed; i++) {
    if (fs.existsSync(path.join(SITEMAPS_DIR, `${prefix}-${i}.xml`))) n = i
    else break
  }
  return n
}

export async function GET() {
  const manifestPath = path.join(SITEMAPS_DIR, '_manifest.json')
  let manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    actorSitemapCount: 0,
    movieSitemapCount: 0,
    performanceSitemapCount: 0,
  }

  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest
  } catch (error) {
    console.warn(
      `[sitemap.xml] Manifest missing or unreadable at ${manifestPath}. Falling back to static sitemap only.`,
      error
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const genDate = (manifest.generatedAt || new Date().toISOString()).split('T')[0]

  const actorCount = existingChunkCount('actors', manifest.actorSitemapCount || 0)
  const movieCount = existingChunkCount('movies', manifest.movieSitemapCount || 0)
  const performanceCount = existingChunkCount(
    'performances',
    manifest.performanceSitemapCount || 0,
  )

  const entries: string[] = []

  if (fs.existsSync(path.join(SITEMAPS_DIR, 'static.xml'))) {
    entries.push(sitemapEntry(`${BASE_URL}/sitemaps/static.xml`, today))
  }

  for (let i = 1; i <= actorCount; i++) {
    entries.push(sitemapEntry(`${BASE_URL}/sitemaps/actors-${i}.xml`, genDate))
  }

  for (let i = 1; i <= movieCount; i++) {
    entries.push(sitemapEntry(`${BASE_URL}/sitemaps/movies-${i}.xml`, genDate))
  }

  for (let i = 1; i <= performanceCount; i++) {
    entries.push(sitemapEntry(`${BASE_URL}/sitemaps/performances-${i}.xml`, genDate))
  }

  if (
    (manifest.listSitemapCount ?? 0) > 0 &&
    fs.existsSync(path.join(SITEMAPS_DIR, 'lists.xml'))
  ) {
    entries.push(sitemapEntry(`${BASE_URL}/sitemaps/lists.xml`, genDate))
  }

  if (
    (manifest.storySitemapCount ?? 0) > 0 &&
    fs.existsSync(path.join(SITEMAPS_DIR, 'stories.xml'))
  ) {
    entries.push(sitemapEntry(`${BASE_URL}/sitemaps/stories.xml`, genDate))
  }

  if (
    (manifest.newsSitemapCount ?? 0) > 0 &&
    fs.existsSync(path.join(SITEMAPS_DIR, 'news.xml'))
  ) {
    entries.push(sitemapEntry(`${BASE_URL}/sitemaps/news.xml`, genDate))
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</sitemapindex>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      // Short CDN TTL so rebuilds that shrink chunk counts don't advertise missing files for hours.
      'Cache-Control': 'public, max-age=0, s-maxage=300, must-revalidate',
      ETag: `"${manifest.generatedAt || today}"`,
    },
  })
}
