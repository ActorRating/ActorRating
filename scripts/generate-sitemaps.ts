/**
 * Generates static sitemap XML from the database with atomic publish:
 *   public/sitemaps-temp → validate → rename swap → public/sitemaps
 *
 * Production (Docker): run full generation only; exits non-zero on failure.
 * Partial --type= is disabled unless ALLOW_PARTIAL_SITEMAPS=1 (dev escape hatch).
 *
 * Run: npx tsx scripts/generate-sitemaps.ts
 */

import * as fs from "fs"
import * as path from "path"
import { prisma } from "../src/lib/prisma"
import { isAdultContentMovie, isAdultContentSlug } from "../src/lib/adult-content-filter"
import { isJunkMovieSlug, isAllowedMovieSlug } from "../src/lib/junk-movie-slugs"
import {
  RECENT_PERFORMANCE_TARGETS,
  ICONIC_PERFORMANCE_TARGETS,
  HOME_LEADERBOARD_ROWS,
} from "../src/lib/performances-page-targets"
import { isFeaturetteMovie, isSelfOrArchiveCredit } from "../src/lib/non-rateable"
import { isMovieComingSoon, parseTmdbReleaseDate } from "../src/lib/movie-release"

const REPO_ROOT = path.join(__dirname, "..")
const LIVE_DIR = path.join(REPO_ROOT, "public", "sitemaps")
const TEMP_DIR = path.join(REPO_ROOT, "public", "sitemaps-temp")
const PREV_DIR = path.join(REPO_ROOT, "public", "sitemaps-prev")

/** Single production hostname — must match NEXT_PUBLIC_BASE_URL in deploy. */
const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || "https://actorrating.com").replace(/\/$/, "")

const CHUNK_SIZE = 5_000
const READ_BATCH = 5_000

type GenerationType = "all" | "actors" | "movies" | "performances"

interface UrlEntry {
  url: string
  lastModified: Date
  changeFrequency: string
  priority: number
}

interface Manifest {
  generatedAt: string
  actorSitemapCount: number
  movieSitemapCount: number
  performanceSitemapCount: number
  listSitemapCount: number
  storySitemapCount: number
  newsSitemapCount: number
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

function writeXml(outDir: string, filename: string, xml: string): void {
  const filePath = path.join(outDir, filename)
  fs.writeFileSync(filePath, xml, "utf-8")
  const kb = Math.round(xml.length / 1024)
  process.stdout.write(`  wrote ${filename} (${kb} KB)\n`)
}

class ChunkWriter {
  private fileCount = 0
  private totalUrls = 0
  private buffer: UrlEntry[] = []

  constructor(
    private readonly outDir: string,
    private readonly prefix: string,
  ) {}

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
    writeXml(this.outDir, `${this.prefix}-${this.fileCount}.xml`, buildUrlsetXml(this.buffer))
    this.buffer = []
  }

  finalize(): { fileCount: number; totalUrls: number } {
    if (this.buffer.length > 0) this.flush()
    return { fileCount: this.fileCount, totalUrls: this.totalUrls }
  }
}

function shouldIncludeMovie(movie: {
  slug: string | null
  id: string
  title: string
  genre: string | null
  overview: string | null
}): boolean {
  const slug = movie.slug ?? movie.id
  if (isAllowedMovieSlug(slug)) return true
  if (isJunkMovieSlug(slug) || isAdultContentSlug(slug)) return false
  if (isAdultContentMovie({ title: movie.title, genre: movie.genre, overview: movie.overview })) return false
  return true
}

/** Rate sitemap: junk/adult + never featurette / coming-soon titles. */
function shouldIncludeRateMovie(movie: {
  slug: string | null
  id: string
  title: string
  genre: string | null
  overview: string | null
  isFeaturette?: boolean | null
  releaseDate?: Date | string | null
  year?: number | null
}): boolean {
  if (isFeaturetteMovie(movie)) return false
  if (isMovieComingSoon(movie)) return false
  // Same calendar year without a concrete releaseDate: keep out of the rate sitemap
  // until TMDB date is stored (avoids shipping noindex / unreleased /rate URLs).
  const year = typeof movie.year === "number" ? movie.year : null
  if (
    year != null &&
    year === new Date().getUTCFullYear() &&
    !parseTmdbReleaseDate(movie.releaseDate ?? null)
  ) {
    return false
  }
  return shouldIncludeMovie(movie)
}

/** Exclude pairs whose only character credits are Self / archive footage. */
function isSelfOnlyCreditPair(characters: Array<string | null | undefined>): boolean {
  const usable = characters
    .map((c) => (typeof c === "string" ? c.trim() : ""))
    .filter(Boolean)
  if (usable.length === 0) return false
  const hasRealRole = usable.some((c) => !isSelfOrArchiveCredit(c))
  if (hasRealRole) return false
  return usable.some((c) => isSelfOrArchiveCredit(c))
}

function rmrf(dir: string): void {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

/** Curated homepage / performances / leaderboard pairs (may overlap). */
function curatedLookupTargets(): { actor: string; movie: string }[] {
  const seen = new Set<string>()
  const out: { actor: string; movie: string }[] = []
  const push = (actor: string, movie: string) => {
    const k = `${actor}\t${movie}`
    if (seen.has(k)) return
    seen.add(k)
    out.push({ actor, movie })
  }
  for (const row of HOME_LEADERBOARD_ROWS) push(row.actor, row.movie)
  for (const t of RECENT_PERFORMANCE_TARGETS) push(t.actor, t.movie)
  for (const t of ICONIC_PERFORMANCE_TARGETS) push(t.actor, t.movie)
  return out
}

/**
 * Resolve curated (actor name, movie title) pairs to DB ids for sitemap URLs.
 * Mirrors performances-by-lookup resolution (requires a Performance row).
 */
async function resolveCuratedPerformancePairs(): Promise<
  Array<{
    actorId: string
    movieId: string
    maxUpd: Date
    movie: {
      slug: string | null
      id: string
      title: string
      genre: string | null
      overview: string | null
      isFeaturette: boolean
      releaseDate: Date | null
      year: number
    }
    actor: { slug: string | null; id: string }
    characters: Array<string | null>
  }>
> {
  const targets = curatedLookupTargets()
  if (targets.length === 0) return []

  const actorNames = [...new Set(targets.map((t) => t.actor))]
  const movieTitles = [...new Set(targets.map((t) => t.movie))]

  const [actors, movies] = await Promise.all([
    prisma.actor.findMany({
      where: { name: { in: actorNames } },
      select: { id: true, name: true, slug: true },
    }),
    prisma.movie.findMany({
      where: { title: { in: movieTitles } },
      select: {
        id: true,
        title: true,
        slug: true,
        genre: true,
        overview: true,
        isFeaturette: true,
        releaseDate: true,
        year: true,
      },
    }),
  ])

  const actorMap = new Map(actors.map((a) => [a.name, a]))
  const movieMap = new Map(movies.map((m) => [m.title, m]))

  const pairs: Array<{ actorId: string; movieId: string }> = []
  for (const target of targets) {
    const actor = actorMap.get(target.actor)
    const movie = movieMap.get(target.movie)
    if (actor && movie) pairs.push({ actorId: actor.id, movieId: movie.id })
  }
  if (pairs.length === 0) return []

  const performances = await prisma.performance.findMany({
    where: { OR: pairs.map((p) => ({ actorId: p.actorId, movieId: p.movieId })) },
    select: {
      actorId: true,
      movieId: true,
      character: true,
      updatedAt: true,
      actor: { select: { id: true, slug: true } },
      movie: {
        select: {
          id: true,
          slug: true,
          title: true,
          genre: true,
          overview: true,
          isFeaturette: true,
          releaseDate: true,
          year: true,
        },
      },
    },
  })

  const ratingMax = await prisma.rating.groupBy({
    by: ["actorId", "movieId"],
    where: { OR: pairs.map((p) => ({ actorId: p.actorId, movieId: p.movieId })) },
    _max: { updatedAt: true },
  })
  const ratingMaxMap = new Map(
    ratingMax.map((r) => [`${r.actorId}:${r.movieId}`, r._max.updatedAt]),
  )

  const byPair = new Map<
    string,
    {
      actorId: string
      movieId: string
      maxUpd: Date
      movie: {
        slug: string | null
        id: string
        title: string
        genre: string | null
        overview: string | null
        isFeaturette: boolean
        releaseDate: Date | null
        year: number
      }
      actor: { slug: string | null; id: string }
      characters: Array<string | null>
    }
  >()

  for (const p of performances) {
    const key = `${p.actorId}:${p.movieId}`
    const rUp = ratingMaxMap.get(key)
    const maxUpd = new Date(
      Math.max(p.updatedAt.getTime(), rUp?.getTime() ?? 0),
    )
    const existing = byPair.get(key)
    if (!existing) {
      byPair.set(key, {
        actorId: p.actorId,
        movieId: p.movieId,
        maxUpd,
        movie: p.movie,
        actor: p.actor,
        characters: [p.character],
      })
    } else {
      existing.characters.push(p.character)
      if (maxUpd > existing.maxUpd) existing.maxUpd = maxUpd
    }
  }
  return Array.from(byPair.values())
}

function generateStatic(outDir: string): void {
  const now = new Date()
  const urls: UrlEntry[] = [
    { url: BASE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/lists`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/forum`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/stories`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/news`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/discover`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ]
  writeXml(outDir, "static.xml", buildUrlsetXml(urls))
  console.log(`    → ${urls.length} URLs (auth URLs excluded — layout is noindex)`)
}

/** Curated /lists/[slug] pages from content/lists/*.md */
function generateLists(outDir: string): number {
  const listsDir = path.join(REPO_ROOT, "content", "lists")
  const urls: UrlEntry[] = []

  if (!fs.existsSync(listsDir)) {
    console.warn(`[sitemap] content/lists missing at ${listsDir} — writing empty lists.xml`)
  } else {
    const files = fs.readdirSync(listsDir).filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    for (const file of files) {
      const slug = file.replace(/\.md$/, "")
      const full = path.join(listsDir, file)
      const raw = fs.readFileSync(full, "utf-8")
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      let lastModified = fs.statSync(full).mtime
      if (match) {
        const pub = match[1].match(/^publishedAt:\s*['"]?([^\s'"]+)/m)
        if (pub?.[1]) {
          const d = new Date(pub[1])
          if (!Number.isNaN(d.getTime())) lastModified = d
        }
      }
      urls.push({
        url: `${BASE_URL}/lists/${slug}`,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.85,
      })
    }
  }

  writeXml(outDir, "lists.xml", buildUrlsetXml(urls))
  console.log(`    → ${urls.length} list URL(s)`)
  return urls.length > 0 ? 1 : 0
}

/** Curated /stories/[slug] or /news/[slug] pages from content/{stories|news}/*.md */
function generateEditorial(
  outDir: string,
  folder: "stories" | "news",
  pathPrefix: "/stories" | "/news",
  fileName: "stories.xml" | "news.xml",
): number {
  const dir = path.join(REPO_ROOT, "content", folder)
  const urls: UrlEntry[] = []

  if (!fs.existsSync(dir)) {
    console.warn(`[sitemap] content/${folder} missing at ${dir} — writing empty ${fileName}`)
  } else {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    for (const file of files) {
      const slug = file.replace(/\.md$/, "")
      const full = path.join(dir, file)
      const raw = fs.readFileSync(full, "utf-8")
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      let lastModified = fs.statSync(full).mtime
      if (match) {
        const pub = match[1].match(/^publishedAt:\s*['"]?([^\s'"]+)/m)
        if (pub?.[1]) {
          const d = new Date(pub[1])
          if (!Number.isNaN(d.getTime())) lastModified = d
        }
      }
      urls.push({
        url: `${BASE_URL}${pathPrefix}/${slug}`,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.8,
      })
    }
  }

  writeXml(outDir, fileName, buildUrlsetXml(urls))
  console.log(`    → ${urls.length} ${folder} URL(s)`)
  return urls.length > 0 ? 1 : 0
}

/** Sitemap: ≥1 rating on non-featurette OR ≥5 performances on non-featurette. */
async function generateActors(outDir: string): Promise<number> {
  const writer = new ChunkWriter(outDir, "actors")
  let lastId = ""
  let processed = 0

  while (true) {
    const rows = await prisma.$queryRaw<Array<{ id: string; slug: string | null; updatedAt: Date }>>`
      SELECT a.id, a.slug, a."updatedAt"
      FROM "Actor" a
      WHERE a.id > ${lastId}
        AND (
          EXISTS (
            SELECT 1 FROM "Rating" r
            INNER JOIN "Movie" m ON m.id = r."movieId" AND NOT m."isFeaturette"
            WHERE r."actorId" = a.id
          )
          OR (
            SELECT COUNT(*)::bigint FROM "Performance" p
            INNER JOIN "Movie" m ON m.id = p."movieId" AND NOT m."isFeaturette"
            WHERE p."actorId" = a.id
          ) >= 5
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

/** Sitemap: ≥1 rating OR ≥5 performances (non-featurette); junk/adult excluded. */
async function generateMovies(outDir: string): Promise<number> {
  const writer = new ChunkWriter(outDir, "movies")
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
          EXISTS (SELECT 1 FROM "Rating" r WHERE r."movieId" = m.id)
          OR (SELECT COUNT(*)::bigint FROM "Performance" p WHERE p."movieId" = m.id) >= 5
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

/**
 * Indexable rate URLs only (aligned with isRatePageIndexable):
 * - non-MINOR pairs with ≥1 community Rating, OR
 * - cohort-1 non-MINOR performances with seededAggregateScore
 * plus curated homepage/performances targets (still subject to movie filters).
 */
async function generatePerformances(outDir: string): Promise<number> {
  const writer = new ChunkWriter(outDir, "performances")
  const seen = new Set<string>()

  const curated = await resolveCuratedPerformancePairs()
  for (const c of curated) {
    if (!shouldIncludeRateMovie(c.movie)) continue
    if (isSelfOnlyCreditPair(c.characters)) continue
    const key = `${c.actorId}:${c.movieId}`
    if (seen.has(key)) continue
    seen.add(key)
    writer.push({
      url: `${BASE_URL}/rate/${c.movie.slug ?? c.movie.id}/${c.actor.slug ?? c.actor.id}`,
      lastModified: c.maxUpd,
      changeFrequency: "weekly",
      priority: 0.7,
    })
  }
  console.log(`  performances: seeded ${seen.size} curated pair(s)`)

  let lastActorId = ""
  let lastMovieId = ""
  let processed = 0

  while (true) {
    const pairs = await prisma.$queryRaw<PairRow[]>`
      SELECT "actorId", "movieId", "maxUpd"
      FROM (
        SELECT r."actorId", r."movieId", MAX(r."updatedAt") AS "maxUpd"
        FROM "Rating" r
        INNER JOIN "Movie" m ON m.id = r."movieId" AND NOT m."isFeaturette"
        WHERE (m."releaseDate" IS NULL OR m."releaseDate" <= CURRENT_DATE)
          AND m.year <= EXTRACT(YEAR FROM CURRENT_DATE)::int
          AND EXISTS (
          SELECT 1 FROM "Performance" p
          WHERE p."actorId" = r."actorId"
            AND p."movieId" = r."movieId"
            AND p.tier <> 'MINOR'
        )
        GROUP BY r."actorId", r."movieId"
        UNION
        SELECT p."actorId", p."movieId", MAX(p."updatedAt") AS "maxUpd"
        FROM "Performance" p
        INNER JOIN "Movie" m ON m.id = p."movieId"
          AND NOT m."isFeaturette"
          AND m."indexingCohort" = 1
        WHERE p."seededAggregateScore" IS NOT NULL
          AND p.tier <> 'MINOR'
          AND (m."releaseDate" IS NULL OR m."releaseDate" <= CURRENT_DATE)
          AND m.year <= EXTRACT(YEAR FROM CURRENT_DATE)::int
        GROUP BY p."actorId", p."movieId"
      ) t
      WHERE (
        ${lastActorId} = '' AND ${lastMovieId} = ''
      ) OR (("actorId", "movieId") > (${lastActorId}, ${lastMovieId}))
      ORDER BY "actorId", "movieId"
      LIMIT ${READ_BATCH}
    `
    if (pairs.length === 0) break

    const actorIds = [...new Set(pairs.map((p) => p.actorId))]
    const movieIds = [...new Set(pairs.map((p) => p.movieId))]

    const [actors, movies, pairPerformances] = await Promise.all([
      prisma.actor.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, slug: true },
      }),
      prisma.movie.findMany({
        where: { id: { in: movieIds } },
        select: {
          id: true,
          slug: true,
          title: true,
          genre: true,
          overview: true,
          isFeaturette: true,
          releaseDate: true,
          year: true,
        },
      }),
      prisma.performance.findMany({
        where: {
          OR: pairs.map((p) => ({ actorId: p.actorId, movieId: p.movieId })),
        },
        select: { actorId: true, movieId: true, character: true },
      }),
    ])

    const actorMap = new Map(actors.map((a) => [a.id, a]))
    const movieMap = new Map(movies.map((m) => [m.id, m]))
    const charactersByPair = new Map<string, Array<string | null>>()
    for (const perf of pairPerformances) {
      const key = `${perf.actorId}:${perf.movieId}`
      const list = charactersByPair.get(key) ?? []
      list.push(perf.character)
      charactersByPair.set(key, list)
    }

    for (const pair of pairs) {
      const key = `${pair.actorId}:${pair.movieId}`
      if (seen.has(key)) continue

      const actor = actorMap.get(pair.actorId)
      const movie = movieMap.get(pair.movieId)
      if (!actor || !movie) continue
      if (!shouldIncludeRateMovie(movie)) continue
      if (isSelfOnlyCreditPair(charactersByPair.get(key) ?? [])) continue

      seen.add(key)
      writer.push({
        url: `${BASE_URL}/rate/${movie.slug ?? movie.id}/${actor.slug ?? actor.id}`,
        lastModified: pair.maxUpd,
        changeFrequency: "weekly",
        priority: 0.7,
      })
    }

    processed += pairs.length
    const tail = pairs[pairs.length - 1]
    lastActorId = tail.actorId
    lastMovieId = tail.movieId
    console.log(
      `  performances: processed ${processed.toLocaleString()} indexable rows, unique URLs ${seen.size.toLocaleString()}...`,
    )
  }

  const result = writer.finalize()
  console.log(`    → ${result.totalUrls} URLs across ${result.fileCount} file(s)`)
  return result.fileCount
}

async function writeManifest(outDir: string, counts: Omit<Manifest, "generatedAt">): Promise<void> {
  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    ...counts,
  }
  fs.writeFileSync(path.join(outDir, "_manifest.json"), JSON.stringify(manifest, null, 2), "utf-8")
}

function readManifest(dir: string): Manifest {
  const raw = fs.readFileSync(path.join(dir, "_manifest.json"), "utf-8")
  return JSON.parse(raw) as Manifest
}

function countUrlTags(xml: string): number {
  const m = xml.match(/<url>/g)
  return m ? m.length : 0
}

function validateLocHosts(xml: string): boolean {
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((x) => x[1])
  for (const loc of locs) {
    if (!loc.startsWith(BASE_URL + "/") && loc !== BASE_URL) {
      console.error(`[sitemap:validate] Bad <loc> host/path: ${loc}`)
      return false
    }
  }
  return true
}

function validateGeneratedSet(outDir: string): void {
  if (!fs.existsSync(path.join(outDir, "static.xml"))) {
    throw new Error("Missing static.xml")
  }

  const manifest = readManifest(outDir)
  const {
    actorSitemapCount,
    movieSitemapCount,
    performanceSitemapCount,
    listSitemapCount = 0,
    storySitemapCount = 0,
    newsSitemapCount = 0,
    generatedAt,
  } = manifest

  if (!generatedAt || typeof actorSitemapCount !== "number") {
    throw new Error("Invalid manifest shape")
  }

  const staticXml = fs.readFileSync(path.join(outDir, "static.xml"), "utf-8")
  if (!staticXml.includes("<urlset")) throw new Error("static.xml: missing urlset")
  const staticUrls = countUrlTags(staticXml)
  if (staticUrls < 1) throw new Error("static.xml: no URLs")
  if (!validateLocHosts(staticXml)) throw new Error("static.xml: invalid loc")

  const checkSeries = (prefix: string, count: number) => {
    if (count < 0) throw new Error(`Invalid ${prefix} count`)
    if (count === 0) {
      for (let i = 1; i <= 5; i++) {
        if (fs.existsSync(path.join(outDir, `${prefix}-${i}.xml`))) {
          throw new Error(`Unexpected ${prefix}-${i}.xml when count is 0`)
        }
      }
      return
    }
    for (let i = 1; i <= count; i++) {
      const name = `${prefix}-${i}.xml`
      const p = path.join(outDir, name)
      if (!fs.existsSync(p)) throw new Error(`Missing ${name}`)
      const xml = fs.readFileSync(p, "utf-8")
      if (!xml.includes("<urlset")) throw new Error(`${name}: missing urlset`)
      const n = countUrlTags(xml)
      if (n < 1) throw new Error(`${name}: empty urlset`)
      if (n > CHUNK_SIZE) throw new Error(`${name}: exceeds CHUNK_SIZE`)
      if (!validateLocHosts(xml)) throw new Error(`${name}: invalid loc`)
    }
    if (fs.existsSync(path.join(outDir, `${prefix}-${count + 1}.xml`))) {
      throw new Error(`${prefix}: manifest count ${count} but extra chunk file exists`)
    }
  }

  checkSeries("actors", actorSitemapCount)
  checkSeries("movies", movieSitemapCount)
  checkSeries("performances", performanceSitemapCount)

  const listsXmlPath = path.join(outDir, "lists.xml")
  if (listSitemapCount > 0) {
    if (!fs.existsSync(listsXmlPath)) throw new Error("Missing lists.xml")
    const listsXml = fs.readFileSync(listsXmlPath, "utf-8")
    if (!listsXml.includes("<urlset")) throw new Error("lists.xml: missing urlset")
    if (countUrlTags(listsXml) < 1) throw new Error("lists.xml: empty urlset")
    if (!validateLocHosts(listsXml)) throw new Error("lists.xml: invalid loc")
  }

  const storiesXmlPath = path.join(outDir, "stories.xml")
  if (storySitemapCount > 0) {
    if (!fs.existsSync(storiesXmlPath)) throw new Error("Missing stories.xml")
    const storiesXml = fs.readFileSync(storiesXmlPath, "utf-8")
    if (!storiesXml.includes("<urlset")) throw new Error("stories.xml: missing urlset")
    if (countUrlTags(storiesXml) < 1) throw new Error("stories.xml: empty urlset")
    if (!validateLocHosts(storiesXml)) throw new Error("stories.xml: invalid loc")
  }

  const newsXmlPath = path.join(outDir, "news.xml")
  if (newsSitemapCount > 0) {
    if (!fs.existsSync(newsXmlPath)) throw new Error("Missing news.xml")
    const newsXml = fs.readFileSync(newsXmlPath, "utf-8")
    if (!newsXml.includes("<urlset")) throw new Error("news.xml: missing urlset")
    if (countUrlTags(newsXml) < 1) throw new Error("news.xml: empty urlset")
    if (!validateLocHosts(newsXml)) throw new Error("news.xml: invalid loc")
  }

  const files = fs.readdirSync(outDir)
  const allowed =
    /^(_manifest\.json|static\.xml|lists\.xml|stories\.xml|news\.xml|(actors|movies|performances)-\d+\.xml)$/
  for (const f of files) {
    if (!allowed.test(f)) {
      throw new Error(`Unexpected file in sitemap output: ${f}`)
    }
  }

  console.log("[sitemap:validate] OK — manifest matches files and XML checks passed.")
}

function atomicSwapTempToLive(): void {
  ensureDir(path.dirname(LIVE_DIR))

  let hadNonEmptyLive = false
  if (fs.existsSync(LIVE_DIR)) {
    const entries = fs.readdirSync(LIVE_DIR)
    if (entries.length > 0) {
      hadNonEmptyLive = true
      rmrf(PREV_DIR)
      fs.renameSync(LIVE_DIR, PREV_DIR)
    } else {
      fs.rmdirSync(LIVE_DIR)
    }
  }

  try {
    fs.renameSync(TEMP_DIR, LIVE_DIR)
  } catch (e) {
    if (hadNonEmptyLive && fs.existsSync(PREV_DIR)) {
      try {
        fs.renameSync(PREV_DIR, LIVE_DIR)
      } catch {
        /* best-effort rollback */
      }
    }
    throw e
  }

  rmrf(PREV_DIR)
  console.log("[sitemap:swap] Live directory replaced atomically.")
}

async function generateAllInto(outDir: string): Promise<void> {
  rmrf(outDir)
  ensureDir(outDir)

  const t0 = Date.now()
  console.log(`[sitemap] Generating into ${outDir} (BASE_URL=${BASE_URL}, CHUNK_SIZE=${CHUNK_SIZE})…`)

  generateStatic(outDir)
  const actorSitemapCount = await generateActors(outDir)
  const movieSitemapCount = await generateMovies(outDir)
  const performanceSitemapCount = await generatePerformances(outDir)
  const listSitemapCount = generateLists(outDir)
  const storySitemapCount = generateEditorial(outDir, "stories", "/stories", "stories.xml")
  const newsSitemapCount = generateEditorial(outDir, "news", "/news", "news.xml")

  await writeManifest(outDir, {
    actorSitemapCount,
    movieSitemapCount,
    performanceSitemapCount,
    listSitemapCount,
    storySitemapCount,
    newsSitemapCount,
  })

  validateGeneratedSet(outDir)

  const ms = Date.now() - t0
  console.log(`[sitemap] Generation + validation finished in ${ms}ms`)
  console.log(
    `[sitemap] Counts: actors=${actorSitemapCount} files, movies=${movieSitemapCount} files, performances=${performanceSitemapCount} files, lists=${listSitemapCount}, stories=${storySitemapCount}, news=${newsSitemapCount}`,
  )
}

async function main(): Promise<void> {
  const selectedType = parseTypeArg()
  const allowPartial = process.env.ALLOW_PARTIAL_SITEMAPS === "1"

  if (selectedType !== "all" && !allowPartial) {
    console.error(
      "[sitemap] Partial --type= runs are disabled (they cannot update the manifest atomically).",
    )
    console.error("[sitemap] Run full generation, or set ALLOW_PARTIAL_SITEMAPS=1 for local debugging.")
    process.exit(1)
  }

  if (selectedType !== "all") {
    console.warn("[sitemap] ALLOW_PARTIAL_SITEMAPS=1 — writing directly to LIVE_DIR (non-atomic).")
    rmrf(LIVE_DIR)
    ensureDir(LIVE_DIR)
    generateStatic(LIVE_DIR)
    const a = await generateActors(LIVE_DIR)
    const m = await generateMovies(LIVE_DIR)
    const p = await generatePerformances(LIVE_DIR)
    const l = generateLists(LIVE_DIR)
    const s = generateEditorial(LIVE_DIR, "stories", "/stories", "stories.xml")
    const n = generateEditorial(LIVE_DIR, "news", "/news", "news.xml")
    await writeManifest(LIVE_DIR, {
      actorSitemapCount: a,
      movieSitemapCount: m,
      performanceSitemapCount: p,
      listSitemapCount: l,
      storySitemapCount: s,
      newsSitemapCount: n,
    })
    validateGeneratedSet(LIVE_DIR)
    console.log("Done (partial / dev mode).")
    return
  }

  const started = Date.now()
  console.log(`[sitemap] === START full atomic generation at ${new Date().toISOString()} ===`)

  await generateAllInto(TEMP_DIR)
  atomicSwapTempToLive()

  console.log(`[sitemap] === END OK (${Date.now() - started}ms total) ===`)
}

main()
  .catch((err) => {
    console.error("[sitemap] FATAL:", err)
    rmrf(TEMP_DIR)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
