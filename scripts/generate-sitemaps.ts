/**
 * Generates static sitemap XML files from the database.
 *
 * Run all:
 *   npx tsx scripts/generate-sitemaps.ts
 *
 * Run one section:
 *   npx tsx scripts/generate-sitemaps.ts --type=actors
 *   npx tsx scripts/generate-sitemaps.ts --type=movies
 *   npx tsx scripts/generate-sitemaps.ts --type=performances
 *
 * Notes:
 * - Writes XML incrementally in chunks (default: 10k URLs/file)
 * - Uses paginated DB reads to avoid loading huge arrays in memory
 */

import * as fs from "fs"
import * as path from "path"
import { prisma } from "../src/lib/prisma"
import { isAdultContentMovie, isAdultContentSlug } from "../src/lib/adult-content-filter"
import { isJunkMovieSlug, isAllowedMovieSlug } from "../src/lib/junk-movie-slugs"

const BASE_URL = "https://actorrating.com"
const CHUNK_SIZE = 10_000
const READ_BATCH = 5_000
const OUT_DIR = path.join(__dirname, "..", "public", "sitemaps")

type GenerationType = "all" | "actors" | "movies" | "performances"
interface UrlEntry {
  url: string
  lastModified: Date
  changeFrequency: string
  priority: number
}

function parseTypeArg(): GenerationType {
  const raw = process.argv.find((arg) => arg.startsWith("--type="))
  if (!raw) return "all"
  const value = raw.split("=")[1] as GenerationType
  if (value === "actors" || value === "movies" || value === "performances") return value
  return "all"
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function buildUrlsetXml(urls: UrlEntry[]): string {
  const inner = urls
    .map((u) => {
      const lastmod = u.lastModified.toISOString().split("T")[0]
      return `  <url>
    <loc>${escapeXml(u.url)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${u.changeFrequency}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    })
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${inner}
</urlset>`
}

function writeXml(filename: string, xml: string): void {
  const filePath = path.join(OUT_DIR, filename)
  fs.writeFileSync(filePath, xml, "utf-8")
  const kb = Math.round(xml.length / 1024)
  process.stdout.write(`  wrote ${filename} (${kb} KB)\n`)
}

class ChunkWriter {
  private fileCount = 0
  private totalUrls = 0
  private buffer: UrlEntry[] = []

  constructor(private readonly prefix: string) {}

  push(entry: UrlEntry): void {
    this.buffer.push(entry)
    this.totalUrls++
    if (this.buffer.length >= CHUNK_SIZE) {
      this.flush()
    }
  }

  flush(): void {
    if (this.buffer.length === 0) return
    this.fileCount++
    writeXml(`${this.prefix}-${this.fileCount}.xml`, buildUrlsetXml(this.buffer))
    this.buffer = []
  }

  finalize(): { fileCount: number; totalUrls: number } {
    if (this.buffer.length > 0) this.flush()
    if (this.fileCount === 0) {
      this.fileCount = 1
      writeXml(`${this.prefix}-1.xml`, buildUrlsetXml([]))
    }
    return { fileCount: this.fileCount, totalUrls: this.totalUrls }
  }
}

function shouldIncludeMovie(movie: { slug: string | null; id: string; title: string; genre: string | null; overview: string | null }): boolean {
  const slug = movie.slug ?? movie.id
  if (isAllowedMovieSlug(slug)) return true
  if (isJunkMovieSlug(slug) || isAdultContentSlug(slug)) return false
  if (isAdultContentMovie({ title: movie.title, genre: movie.genre, overview: movie.overview })) return false
  return true
}

function ensureOutDir(): void {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })
}

function cleanupExisting(selectedType: GenerationType): void {
  const files = fs.readdirSync(OUT_DIR)
  for (const file of files) {
    if (selectedType === "all") {
      if (file.endsWith(".xml") || file === "_manifest.json") fs.unlinkSync(path.join(OUT_DIR, file))
      continue
    }
    if (file.startsWith(`${selectedType}-`) && file.endsWith(".xml")) {
      fs.unlinkSync(path.join(OUT_DIR, file))
    }
  }
}

function generateStatic(): void {
  const now = new Date()
  const urls: UrlEntry[] = [
    { url: BASE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/auth/signin`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/auth/register`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/oscars-2026`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
  ]
  writeXml("static.xml", buildUrlsetXml(urls))
  console.log(`    → ${urls.length} URLs`)
}

async function generateActors(): Promise<number> {
  const writer = new ChunkWriter("actors")
  let lastId = ""
  let processed = 0

  while (true) {
    const rows = await prisma.$queryRaw<Array<{ id: string; slug: string | null; updatedAt: Date }>>`
      SELECT a.id, a.slug, a."updatedAt"
      FROM "Actor" a
      WHERE a.id > ${lastId}
        AND (
          EXISTS (
            SELECT 1
            FROM "Performance" p
            INNER JOIN "Movie" m ON m.id = p."movieId" AND NOT m."isFeaturette"
            WHERE p."actorId" = a.id
          )
          OR EXISTS (
            SELECT 1
            FROM "Rating" r
            INNER JOIN "Movie" m ON m.id = r."movieId" AND NOT m."isFeaturette"
            WHERE r."actorId" = a.id
          )
        )
      ORDER BY a.id
      LIMIT ${READ_BATCH}
    `
    if (rows.length === 0) break

    for (const row of rows) {
      writer.push({
        url: `${BASE_URL}/actors/${row.slug ?? row.id}`,
        lastModified: row.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      })
    }

    processed += rows.length
    lastId = rows[rows.length - 1].id
    console.log(`  actors: processed ${processed.toLocaleString()} rows...`)
  }

  const result = writer.finalize()
  console.log(`    → ${result.totalUrls} URLs across ${result.fileCount} file(s)`)
  return result.fileCount
}

async function generateMovies(): Promise<number> {
  const writer = new ChunkWriter("movies")
  let lastId = ""
  let processed = 0
  let accepted = 0

  while (true) {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; slug: string | null; updatedAt: Date; title: string; genre: string | null; overview: string | null }>
    >`
      SELECT m.id, m.slug, m."updatedAt", m.title, m.genre, m.overview
      FROM "Movie" m
      WHERE m.id > ${lastId}
        AND NOT m."isFeaturette"
        AND (
          EXISTS (SELECT 1 FROM "Performance" p WHERE p."movieId" = m.id)
          OR EXISTS (SELECT 1 FROM "Rating" r WHERE r."movieId" = m.id)
        )
      ORDER BY m.id
      LIMIT ${READ_BATCH}
    `
    if (rows.length === 0) break

    for (const row of rows) {
      if (!shouldIncludeMovie(row)) continue
      writer.push({
        url: `${BASE_URL}/movies/${row.slug ?? row.id}`,
        lastModified: row.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      })
      accepted++
    }

    processed += rows.length
    lastId = rows[rows.length - 1].id
    console.log(`  movies: processed ${processed.toLocaleString()} rows, accepted ${accepted.toLocaleString()}...`)
  }

  const result = writer.finalize()
  console.log(`    → ${result.totalUrls} URLs across ${result.fileCount} file(s)`)
  return result.fileCount
}

type PairRow = { actorId: string; movieId: string; maxUpd: Date }

async function generatePerformances(): Promise<number> {
  const writer = new ChunkWriter("performances")
  let lastActorId = ""
  let lastMovieId = ""
  let processed = 0
  let accepted = 0

  while (true) {
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
      WHERE (
        ${lastActorId} = '' AND ${lastMovieId} = ''
      ) OR (("actorId", "movieId") > (${lastActorId}, ${lastMovieId}))
      ORDER BY "actorId", "movieId"
      LIMIT ${READ_BATCH}
    `
    if (pairs.length === 0) break

    const actorIds = [...new Set(pairs.map((p) => p.actorId))]
    const movieIds = [...new Set(pairs.map((p) => p.movieId))]

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

    for (const pair of pairs) {
      const actor = actorMap.get(pair.actorId)
      const movie = movieMap.get(pair.movieId)
      if (!actor || !movie || movie.isFeaturette) continue
      if (!shouldIncludeMovie(movie)) continue

      writer.push({
        url: `${BASE_URL}/rate/${movie.slug ?? movie.id}/${actor.slug ?? actor.id}`,
        lastModified: pair.maxUpd,
        changeFrequency: "weekly",
        priority: 0.7,
      })
      accepted++
    }

    processed += pairs.length
    const tail = pairs[pairs.length - 1]
    lastActorId = tail.actorId
    lastMovieId = tail.movieId
    console.log(`  performances: processed ${processed.toLocaleString()} pairs, accepted ${accepted.toLocaleString()}...`)
  }

  const result = writer.finalize()
  console.log(`    → ${result.totalUrls} URLs across ${result.fileCount} file(s)`)
  return result.fileCount
}

async function writeManifest(counts: {
  actorSitemapCount: number
  movieSitemapCount: number
  performanceSitemapCount: number
}): Promise<void> {
  const manifest = {
    generatedAt: new Date().toISOString(),
    ...counts,
  }
  fs.writeFileSync(path.join(OUT_DIR, "_manifest.json"), JSON.stringify(manifest, null, 2), "utf-8")
}

async function main(): Promise<void> {
  const selectedType = parseTypeArg()
  console.log(`Generating sitemaps (type=${selectedType})…\n`)
  ensureOutDir()
  cleanupExisting(selectedType)

  let actorSitemapCount = 0
  let movieSitemapCount = 0
  let performanceSitemapCount = 0

  if (selectedType === "all") {
    console.log("static.xml")
    generateStatic()
  }

  if (selectedType === "all" || selectedType === "actors") {
    console.log("actors-*.xml")
    actorSitemapCount = await generateActors()
  }

  if (selectedType === "all" || selectedType === "movies") {
    console.log("movies-*.xml")
    movieSitemapCount = await generateMovies()
  }

  if (selectedType === "all" || selectedType === "performances") {
    console.log("performances-*.xml")
    performanceSitemapCount = await generatePerformances()
  }

  if (selectedType === "all") {
    await writeManifest({ actorSitemapCount, movieSitemapCount, performanceSitemapCount })
    const totalFiles = 1 + actorSitemapCount + movieSitemapCount + performanceSitemapCount
    console.log(`\n_manifest.json written`)
    console.log(`Total: ${totalFiles} sitemap files\n`)
  } else {
    console.log(`\nPartial generation done for type=${selectedType}.`)
  }
  console.log("Done.")
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
