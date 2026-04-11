/**
 * Generates static sitemap XML files from the database.
 *
 * Run:  npx tsx scripts/generate-sitemaps.ts
 * Output: public/sitemaps/static.xml
 *         public/sitemaps/actors-1.xml … actors-N.xml
 *         public/sitemaps/movies-1.xml … movies-N.xml  (usually 1 file)
 *         public/sitemaps/performances-1.xml … performances-N.xml
 *         public/sitemaps/_manifest.json   ← read by sitemap.xml route (no DB)
 *
 * The files are NOT committed to git — they are generated fresh during each deploy:
 *   "vercel-build": "npx tsx scripts/generate-sitemaps.ts && prisma generate && next build"
 *
 * Google sitemap limits: 50,000 URLs / 50 MB per file.
 */

import { prisma } from '../src/lib/prisma'
import { isAdultContentMovie, isAdultContentSlug } from '../src/lib/adult-content-filter'
import { isJunkMovieSlug, isAllowedMovieSlug } from '../src/lib/junk-movie-slugs'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'https://www.actorrating.com'
const CHUNK_SIZE = 10_000
const OUT_DIR = path.join(__dirname, '..', 'public', 'sitemaps')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

interface UrlEntry {
  url: string
  lastModified: Date
  changeFrequency: string
  priority: number
}

function buildUrlsetXml(urls: UrlEntry[]): string {
  const inner = urls
    .map((u) => {
      const lastmod = u.lastModified.toISOString().split('T')[0]
      return `  <url>
    <loc>${escapeXml(u.url)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${u.changeFrequency}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${inner}
</urlset>`
}

function writeXml(filename: string, xml: string): void {
  const filePath = path.join(OUT_DIR, filename)
  fs.writeFileSync(filePath, xml, 'utf-8')
  const kb = Math.round(xml.length / 1024)
  process.stdout.write(`  wrote ${filename} (${kb} KB)\n`)
}

/** Chunks an array into pages of `size` and writes them as `prefix-N.xml`. Returns file count. */
function writeChunked(
  prefix: string,
  items: UrlEntry[],
  changeFrequency: string,
  priority: number,
): number {
  if (items.length === 0) {
    writeXml(`${prefix}-1.xml`, buildUrlsetXml([]))
    return 1
  }
  let count = 0
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    count++
    const chunk = items.slice(i, i + CHUNK_SIZE)
    writeXml(`${prefix}-${count}.xml`, buildUrlsetXml(chunk))
  }
  return count
}

// ---------------------------------------------------------------------------
// 1. Static sitemap  (single file — only 6 URLs)
// ---------------------------------------------------------------------------

function generateStatic(): void {
  const now = new Date()
  const urls: UrlEntry[] = [
    { url: BASE_URL,                     lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/about`,          lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/auth/signin`,    lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/auth/signup`,    lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/privacy-policy`, lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE_URL}/oscars-2026`,    lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
  ]
  writeXml('static.xml', buildUrlsetXml(urls))
  console.log(`    → ${urls.length} URLs`)
}

// ---------------------------------------------------------------------------
// 2. Actors sitemaps  (chunked — can exceed 50k URLs)
// ---------------------------------------------------------------------------

async function generateActors(): Promise<number> {
  const idRows = await prisma.$queryRaw<Array<{ actorId: string }>>`
    SELECT DISTINCT p."actorId" FROM "Performance" p
    INNER JOIN "Movie" m ON m.id = p."movieId" AND NOT m."isFeaturette"
    UNION
    SELECT DISTINCT r."actorId" FROM "Rating" r
    INNER JOIN "Movie" m ON m.id = r."movieId" AND NOT m."isFeaturette"
  `
  const ids = [...new Set(idRows.map((r) => r.actorId))]

  const BATCH = 5_000
  const actors: Array<{ id: string; slug: string | null; updatedAt: Date }> = []
  for (let i = 0; i < ids.length; i += BATCH) {
    const rows = await prisma.actor.findMany({
      where: { id: { in: ids.slice(i, i + BATCH) } },
      select: { id: true, slug: true, updatedAt: true },
    })
    actors.push(...rows)
  }
  actors.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

  const urls: UrlEntry[] = actors.map((a) => ({
    url: `${BASE_URL}/actors/${a.slug ?? a.id}`,
    lastModified: a.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const count = writeChunked('actors', urls, 'weekly', 0.8)
  console.log(`    → ${urls.length} URLs across ${count} file(s)`)
  return count
}

// ---------------------------------------------------------------------------
// 3. Movies sitemaps  (chunked)
// ---------------------------------------------------------------------------

async function generateMovies(): Promise<number> {
  const idRows = await prisma.$queryRaw<Array<{ movieId: string }>>`
    SELECT DISTINCT p."movieId" FROM "Performance" p
    INNER JOIN "Movie" m ON m.id = p."movieId" AND NOT m."isFeaturette"
    UNION
    SELECT DISTINCT r."movieId" FROM "Rating" r
    INNER JOIN "Movie" m ON m.id = r."movieId" AND NOT m."isFeaturette"
  `
  const ids = [...new Set(idRows.map((r) => r.movieId))]

  const BATCH = 5_000
  const movies: Array<{
    id: string; slug: string | null; updatedAt: Date
    title: string; genre: string | null; overview: string | null
  }> = []
  for (let i = 0; i < ids.length; i += BATCH) {
    const rows = await prisma.movie.findMany({
      where: { id: { in: ids.slice(i, i + BATCH) }, isFeaturette: false },
      select: { id: true, slug: true, updatedAt: true, title: true, genre: true, overview: true },
    })
    movies.push(...rows)
  }
  movies.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

  const urls: UrlEntry[] = movies
    .filter((m) => {
      const slug = m.slug ?? m.id
      if (isAllowedMovieSlug(slug)) return true
      if (isJunkMovieSlug(slug) || isAdultContentSlug(slug)) return false
      if (isAdultContentMovie({ title: m.title, genre: m.genre, overview: m.overview })) return false
      return true
    })
    .map((m) => ({
      url: `${BASE_URL}/movies/${m.slug ?? m.id}`,
      lastModified: m.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

  const count = writeChunked('movies', urls, 'weekly', 0.8)
  console.log(`    → ${urls.length} URLs across ${count} file(s)`)
  return count
}

// ---------------------------------------------------------------------------
// 4. Performances sitemaps  (chunked)
// ---------------------------------------------------------------------------

type PairRow = { actorId: string; movieId: string; maxUpd: Date }

async function generatePerformances(): Promise<number> {
  const pairs = await prisma.$queryRaw<PairRow[]>`
    WITH merged AS (
      SELECT "actorId", "movieId", MAX(upd) AS "maxUpd"
      FROM (
        SELECT p."actorId", p."movieId", p."updatedAt" AS upd
        FROM "Performance" p
        INNER JOIN "Movie" m ON m.id = p."movieId" AND NOT m."isFeaturette"
        UNION ALL
        SELECT r."actorId", r."movieId", r."updatedAt" AS upd
        FROM "Rating" r
        INNER JOIN "Movie" m ON m.id = r."movieId" AND NOT m."isFeaturette"
      ) u
      GROUP BY "actorId", "movieId"
    )
    SELECT "actorId", "movieId", "maxUpd"
    FROM merged
    ORDER BY "actorId", "movieId"
  `

  console.log(`    fetched ${pairs.length} raw pairs`)

  const actorIds = [...new Set(pairs.map((p) => p.actorId))]
  const movieIds = [...new Set(pairs.map((p) => p.movieId))]
  const BATCH = 5_000

  const actorMap = new Map<string, { id: string; slug: string | null }>()
  for (let i = 0; i < actorIds.length; i += BATCH) {
    const rows = await prisma.actor.findMany({
      where: { id: { in: actorIds.slice(i, i + BATCH) } },
      select: { id: true, slug: true },
    })
    rows.forEach((a) => actorMap.set(a.id, a))
  }

  const movieMap = new Map<
    string,
    { id: string; slug: string | null; title: string; genre: string | null; overview: string | null; isFeaturette: boolean }
  >()
  for (let i = 0; i < movieIds.length; i += BATCH) {
    const rows = await prisma.movie.findMany({
      where: { id: { in: movieIds.slice(i, i + BATCH) } },
      select: { id: true, slug: true, title: true, genre: true, overview: true, isFeaturette: true },
    })
    rows.forEach((m) => movieMap.set(m.id, m))
  }

  const urls: UrlEntry[] = []
  for (const pair of pairs) {
    const actor = actorMap.get(pair.actorId)
    const movie = movieMap.get(pair.movieId)
    if (!actor || !movie || movie.isFeaturette) continue

    const movieSlug = movie.slug ?? movie.id
    if (!isAllowedMovieSlug(movieSlug)) {
      if (isJunkMovieSlug(movieSlug) || isAdultContentSlug(movieSlug)) continue
      if (isAdultContentMovie({ title: movie.title, genre: movie.genre, overview: movie.overview })) continue
    }

    urls.push({
      url: `${BASE_URL}/rate/${movie.slug ?? movie.id}/${actor.slug ?? actor.id}`,
      lastModified: pair.maxUpd,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  const count = writeChunked('performances', urls, 'weekly', 0.7)
  console.log(`    → ${urls.length} URLs across ${count} file(s)`)
  return count
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Generating static sitemaps…\n')

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true })
  }

  // Clean up any stale files from previous runs.
  for (const file of fs.readdirSync(OUT_DIR)) {
    if (file.endsWith('.xml') || file === '_manifest.json') {
      fs.unlinkSync(path.join(OUT_DIR, file))
    }
  }

  console.log('static.xml')
  generateStatic()

  console.log('actors-*.xml')
  const actorSitemapCount = await generateActors()

  console.log('movies-*.xml')
  const movieSitemapCount = await generateMovies()

  console.log('performances-*.xml')
  const performanceSitemapCount = await generatePerformances()

  const manifest = {
    generatedAt: new Date().toISOString(),
    actorSitemapCount,
    movieSitemapCount,
    performanceSitemapCount,
  }
  const manifestPath = path.join(OUT_DIR, '_manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

  const totalFiles = 1 + actorSitemapCount + movieSitemapCount + performanceSitemapCount
  console.log(`\n_manifest.json written`)
  console.log(`Total: ${totalFiles} sitemap files\n`)
  console.log('Done.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
