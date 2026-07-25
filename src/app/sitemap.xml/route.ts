export const dynamic = "force-dynamic"

import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://actorrating.com'

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

export async function GET() {
  const manifestPath = path.join(process.cwd(), 'public', 'sitemaps', '_manifest.json')
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
  const genDate = manifest.generatedAt.split('T')[0]

  const entries: string[] = [
    sitemapEntry(`${BASE_URL}/sitemaps/static.xml`, today),
  ]

  for (let i = 1; i <= manifest.actorSitemapCount; i++) {
    entries.push(sitemapEntry(`${BASE_URL}/sitemaps/actors-${i}.xml`, genDate))
  }

  for (let i = 1; i <= manifest.movieSitemapCount; i++) {
    entries.push(sitemapEntry(`${BASE_URL}/sitemaps/movies-${i}.xml`, genDate))
  }

  for (let i = 1; i <= manifest.performanceSitemapCount; i++) {
    entries.push(sitemapEntry(`${BASE_URL}/sitemaps/performances-${i}.xml`, genDate))
  }

  if ((manifest.listSitemapCount ?? 0) > 0) {
    entries.push(sitemapEntry(`${BASE_URL}/sitemaps/lists.xml`, genDate))
  }

  if ((manifest.storySitemapCount ?? 0) > 0) {
    entries.push(sitemapEntry(`${BASE_URL}/sitemaps/stories.xml`, genDate))
  }

  if ((manifest.newsSitemapCount ?? 0) > 0) {
    entries.push(sitemapEntry(`${BASE_URL}/sitemaps/news.xml`, genDate))
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</sitemapindex>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
