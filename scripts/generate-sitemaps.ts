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
import { isSelfOnlyCreditPair } from "../src/lib/non-rateable"
import { isRatePageIndexable, MIN_COMMUNITY_RATINGS_FOR_INDEX } from "../src/lib/rate-page-seo"
import { pickCanonicalPerformanceSeoMeta } from "../src/lib/rate-page-canonical-perf"
import { isSitemapEligibleRateMovie } from "../src/lib/rate-page-sitemap-eligibility"
import { listStaticSitemapPaths } from "../src/lib/seo/static-sitemap-urls"
import { listPriorityStaticSitemapPaths } from "../src/lib/seo/priority-sitemap"
import { HUB_ENABLED_SLUGS } from "../src/lib/movie-best-performances/hub-allowlist"

/**
 * Bump when sitemap indexability logic changes — printed at gen start so
 * production logs prove which build is running (independent of Coolify env).
 */
const SITEMAP_BUILD_ID = "priority-sitemap-v1-2026-11-14"

const REPO_ROOT = path.join(__dirname, "..")
const LIVE_DIR = path.join(REPO_ROOT, "public", "sitemaps")
const TEMP_DIR = path.join(REPO_ROOT, "public", "sitemaps-temp")
const PREV_DIR = path.join(REPO_ROOT, "public", "sitemaps-prev")

/** Single production hostname — must match NEXT_PUBLIC_BASE_URL in deploy. */
const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || "https://actorrating.com").replace(/\/$/, "")

const CHUNK_SIZE = 5_000
const READ_BATCH = 5_000

/** Pairs called out in SEO ops; logged at end of performances gen for smoke-checks. */
const WATCH_RATE_PATHS = [
  "/rate/fight-club-1999/edward-norton",
  "/rate/the-godfather-1972/marlon-brando",
  "/rate/no-country-for-old-men-2007/javier-bardem",
  "/rate/se7en-1995/brad-pitt",
  "/rate/the-godfather-part-ii-1974/robert-de-niro",
  "/rate/the-revenant-2015/leonardo-dicaprio",
  "/rate/the-wolf-of-wall-street-2013/jonah-hill",
  "/rate/the-wolf-of-wall-street-2013/matthew-mcconaughey",
]

function deployFingerprint(): string {
  const commit =
    process.env.SOURCE_COMMIT ||
    process.env.COOLIFY_GIT_COMMIT ||
    process.env.GIT_COMMIT ||
    process.env.COMMIT_SHA ||
    "unknown"
  return `buildId=${SITEMAP_BUILD_ID} commit=${commit.slice(0, 12)}`
}

function indexabilitySkipReason(input: {
  movieSlug: string | null | undefined
  movieTitle: string | null | undefined
  communityRatingCount: number
  tier: string | null | undefined
}): string {
  if (!input.movieTitle?.trim()) return "malformed_empty_title"
  const slug = (input.movieSlug ?? "").trim()
  if (slug && /^-\d{4}(-[a-z0-9]+)?$/i.test(slug)) return "malformed_slug"
  if (!input.tier) return "tier_null"
  if (input.tier === "MINOR") return "tier_MINOR"
  if (input.communityRatingCount < MIN_COMMUNITY_RATINGS_FOR_INDEX) {
    return `rating_count=${input.communityRatingCount}<${MIN_COMMUNITY_RATINGS_FOR_INDEX}`
  }
  return "unknown"
}

type GenerationType = "all" | "actors" | "movies" | "performances"

interface UrlEntry {
  url: string
  lastModified: Date
  changeFrequency: string
  priority: number
}

interface Manifest {
  generatedAt: string
  buildId: string
  prioritySitemapCount: number
  actorSitemapCount: number
  movieSitemapCount: number
  performanceSitemapCount: number
  listSitemapCount: number
  storySitemapCount: number
  newsSitemapCount: number
  /** Per child-sitemap max URL lastmod (YYYY-MM-DD), not generation time. */
  sitemapLastmods: Record<string, string>
}

function toYmd(d: Date): string {
  return d.toISOString().split("T")[0]
}

function maxDate(dates: Array<Date | null | undefined>): Date | null {
  let maxMs = -Infinity
  for (const d of dates) {
    if (!d) continue
    const ms = d.getTime()
    if (Number.isFinite(ms) && ms > maxMs) maxMs = ms
  }
  return maxMs === -Infinity ? null : new Date(maxMs)
}

function fileMtime(absPath: string): Date | null {
  try {
    return fs.statSync(absPath).mtime
  } catch {
    return null
  }
}

function recordLastmod(
  lastmods: Record<string, string>,
  filename: string,
  urls: UrlEntry[],
): void {
  const max = maxDate(urls.map((u) => u.lastModified))
  if (max) lastmods[filename] = toYmd(max)
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
  private readonly lastmods: Record<string, string>

  constructor(
    private readonly outDir: string,
    private readonly prefix: string,
    lastmods?: Record<string, string>,
  ) {
    this.lastmods = lastmods ?? {}
  }

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
    const filename = `${this.prefix}-${this.fileCount}.xml`
    writeXml(this.outDir, filename, buildUrlsetXml(this.buffer))
    recordLastmod(this.lastmods, filename, this.buffer)
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
    tier: string | null
    seededAggregateScore: number | null
    communityRatingCount: number
    movie: {
      slug: string | null
      id: string
      title: string
      genre: string | null
      overview: string | null
      isFeaturette: boolean
      releaseDate: Date | null
      year: number
      indexingCohort: number
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
        indexingCohort: true,
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
      tier: true,
      seededAggregateScore: true,
      userId: true,
      order: true,
      createdAt: true,
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
          indexingCohort: true,
        },
      },
    },
  })

  const ratingGroups = await prisma.rating.groupBy({
    by: ["actorId", "movieId"],
    where: { OR: pairs.map((p) => ({ actorId: p.actorId, movieId: p.movieId })) },
    _max: { updatedAt: true },
    _count: { _all: true },
  })
  const ratingMaxMap = new Map(
    ratingGroups.map((r) => [`${r.actorId}:${r.movieId}`, r._max.updatedAt]),
  )
  const ratingCountMap = new Map(
    ratingGroups.map((r) => [`${r.actorId}:${r.movieId}`, r._count._all]),
  )

  const rowsByPair = new Map<string, typeof performances>()
  for (const p of performances) {
    const key = `${p.actorId}:${p.movieId}`
    const list = rowsByPair.get(key)
    if (list) list.push(p)
    else rowsByPair.set(key, [p])
  }

  const out: Array<{
    actorId: string
    movieId: string
    maxUpd: Date
    tier: string | null
    seededAggregateScore: number | null
    communityRatingCount: number
    movie: {
      slug: string | null
      id: string
      title: string
      genre: string | null
      overview: string | null
      isFeaturette: boolean
      releaseDate: Date | null
      year: number
      indexingCohort: number
    }
    actor: { slug: string | null; id: string }
    characters: Array<string | null>
  }> = []

  for (const [key, rows] of rowsByPair) {
    const first = rows[0]
    const meta = pickCanonicalPerformanceSeoMeta(rows)
    const rUp = ratingMaxMap.get(key)
    const maxPerfUpd = Math.max(...rows.map((r) => r.updatedAt.getTime()))
    out.push({
      actorId: first.actorId,
      movieId: first.movieId,
      maxUpd: new Date(Math.max(maxPerfUpd, rUp?.getTime() ?? 0)),
      tier: meta.tier,
      seededAggregateScore: meta.seededAggregateScore,
      communityRatingCount: ratingCountMap.get(key) ?? 0,
      movie: first.movie,
      actor: first.actor,
      characters: meta.characters,
    })
  }
  return out
}

function staticPathLastmod(pathStr: string, fallback: Date): Date {
  const candidates: Array<Date | null> = [fallback]
  if (pathStr === "/") {
    candidates.push(fileMtime(path.join(REPO_ROOT, "src/app/page.tsx")))
  } else if (pathStr === "/methodology") {
    candidates.push(fileMtime(path.join(REPO_ROOT, "src/app/methodology/page.tsx")))
  } else if (pathStr === "/discover") {
    candidates.push(fileMtime(path.join(REPO_ROOT, "src/app/discover/page.tsx")))
  } else if (pathStr === "/about") {
    candidates.push(fileMtime(path.join(REPO_ROOT, "src/app/about/page.tsx")))
  } else if (pathStr === "/lists") {
    candidates.push(fileMtime(path.join(REPO_ROOT, "src/app/lists/page.tsx")))
  } else if (pathStr === "/forum") {
    candidates.push(fileMtime(path.join(REPO_ROOT, "src/app/forum/page.tsx")))
  } else if (pathStr === "/stories") {
    candidates.push(fileMtime(path.join(REPO_ROOT, "src/app/stories/page.tsx")))
  } else if (pathStr === "/news") {
    candidates.push(fileMtime(path.join(REPO_ROOT, "src/app/news/page.tsx")))
  } else if (pathStr.startsWith("/craft/")) {
    candidates.push(fileMtime(path.join(REPO_ROOT, "src/app/craft/[dimension]/page.tsx")))
  } else if (pathStr.includes("/best-performances")) {
    candidates.push(
      fileMtime(path.join(REPO_ROOT, "src/app/movies/[slug]/best-performances/page.tsx")),
    )
  } else if (pathStr === "/privacy") {
    candidates.push(fileMtime(path.join(REPO_ROOT, "src/app/privacy/page.tsx")))
  } else if (pathStr === "/terms") {
    candidates.push(fileMtime(path.join(REPO_ROOT, "src/app/terms/page.tsx")))
  }
  return maxDate(candidates) ?? fallback
}

function generateStatic(
  outDir: string,
  lastmods: Record<string, string>,
  activityFallback: Date,
): void {
  const urls: UrlEntry[] = listStaticSitemapPaths().map((entry) => ({
    url: entry.path === "/" ? BASE_URL : `${BASE_URL}${entry.path}`,
    lastModified: staticPathLastmod(entry.path, activityFallback),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }))
  writeXml(outDir, "static.xml", buildUrlsetXml(urls))
  recordLastmod(lastmods, "static.xml", urls)
  console.log(`    → ${urls.length} URLs (auth URLs excluded — layout is noindex)`)
}

/** Curated /lists/[slug] pages from content/lists/*.md */
function collectListUrlEntries(): UrlEntry[] {
  const listsDir = path.join(REPO_ROOT, "content", "lists")
  const urls: UrlEntry[] = []

  if (!fs.existsSync(listsDir)) {
    console.warn(`[sitemap] content/lists missing at ${listsDir}`)
    return urls
  }

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
  return urls
}

function generateLists(outDir: string, lastmods: Record<string, string>): number {
  const urls = collectListUrlEntries()
  writeXml(outDir, "lists.xml", buildUrlsetXml(urls))
  recordLastmod(lastmods, "lists.xml", urls)
  console.log(`    → ${urls.length} list URL(s)`)
  return urls.length > 0 ? 1 : 0
}

/** Curated /stories/[slug] or /news/[slug] pages from content/{stories|news}/*.md + SiteEditorial DB */
async function generateEditorial(
  outDir: string,
  folder: "stories" | "news",
  pathPrefix: "/stories" | "/news",
  fileName: "stories.xml" | "news.xml",
  lastmods: Record<string, string>,
): Promise<number> {
  const dir = path.join(REPO_ROOT, "content", folder)
  const urls: UrlEntry[] = []
  const seen = new Set<string>()

  if (!fs.existsSync(dir)) {
    console.warn(`[sitemap] content/${folder} missing at ${dir} — will try DB rows for ${fileName}`)
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
      seen.add(slug)
      urls.push({
        url: `${BASE_URL}${pathPrefix}/${slug}`,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.8,
      })
    }
  }

  try {
    const kind = folder === "stories" ? "story" : "news"
    const rows = await prisma.siteEditorial.findMany({
      where: { kind, status: "PUBLISHED" },
      select: { slug: true, publishedAt: true, updatedAt: true },
    })
    for (const row of rows) {
      if (seen.has(row.slug)) continue
      urls.push({
        url: `${BASE_URL}${pathPrefix}/${row.slug}`,
        lastModified: row.updatedAt ?? row.publishedAt,
        changeFrequency: "weekly",
        priority: 0.75,
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (!msg.includes("SiteEditorial") && !msg.includes("P2021")) {
      console.warn(`[sitemap] SiteEditorial merge skipped: ${msg}`)
    }
  }

  writeXml(outDir, fileName, buildUrlsetXml(urls))
  recordLastmod(lastmods, fileName, urls)
  console.log(`    → ${urls.length} ${folder} URL(s)`)
  return urls.length > 0 ? 1 : 0
}

type SignedInEntityRow = {
  id: string
  slug: string | null
  updatedAt: Date
  lastRatingAt: Date
}

type SignedInMovieRow = SignedInEntityRow & {
  title: string
  genre: string | null
  overview: string | null
  year: number | null
  releaseDate: Date | null
  indexingCohort: number
  isFeaturette: boolean
}

type SignedInPerfRow = {
  actorId: string
  movieId: string
  lastRatingAt: Date
}

/**
 * Priority child sitemap: static subset + lists + entities with ≥1 signed-in rating.
 * Duplicates with other sitemap files are intentional. lastmod = latest rating / update.
 */
async function generatePriority(
  outDir: string,
  lastmods: Record<string, string>,
  activityFallback: Date,
): Promise<number> {
  const urls: UrlEntry[] = []
  const seen = new Set<string>()
  const push = (entry: UrlEntry) => {
    if (seen.has(entry.url)) return
    seen.add(entry.url)
    urls.push(entry)
  }

  for (const entry of listPriorityStaticSitemapPaths()) {
    push({
      url: entry.path === "/" ? BASE_URL : `${BASE_URL}${entry.path}`,
      lastModified: staticPathLastmod(entry.path, activityFallback),
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    })
  }

  for (const listEntry of collectListUrlEntries()) {
    push(listEntry)
  }

  // Hub lastmod: prefer latest signed-in rating on that film, else movie.updatedAt.
  for (const slug of HUB_ENABLED_SLUGS) {
    const hubUrl = `${BASE_URL}/movies/${slug}/best-performances`
    const hubRows = await prisma.$queryRaw<Array<{ lastRatingAt: Date | null; updatedAt: Date }>>`
      SELECT MAX(r."updatedAt") AS "lastRatingAt", m."updatedAt"
      FROM "Movie" m
      LEFT JOIN "Rating" r ON r."movieId" = m.id AND r."userId" IS NOT NULL
      WHERE m.slug = ${slug}
      GROUP BY m.id, m."updatedAt"
      LIMIT 1
    `
    if (hubRows[0]) {
      const lm = maxDate([hubRows[0].lastRatingAt, hubRows[0].updatedAt]) ?? activityFallback
      const existing = urls.find((u) => u.url === hubUrl)
      if (existing) existing.lastModified = lm
    }
  }

  const actors = await prisma.$queryRaw<SignedInEntityRow[]>`
    SELECT a.id, a.slug, a."updatedAt", MAX(r."updatedAt") AS "lastRatingAt"
    FROM "Rating" r
    JOIN "Actor" a ON a.id = r."actorId"
    WHERE r."userId" IS NOT NULL
    GROUP BY a.id, a.slug, a."updatedAt"
    ORDER BY MAX(r."updatedAt") DESC
  `
  for (const row of actors) {
    push({
      url: `${BASE_URL}/actors/${row.slug ?? row.id}`,
      lastModified: maxDate([row.lastRatingAt, row.updatedAt]) ?? activityFallback,
      changeFrequency: "weekly",
      priority: 0.9,
    })
  }

  const movies = await prisma.$queryRaw<SignedInMovieRow[]>`
    SELECT
      m.id, m.slug, m.title, m.genre, m.overview, m.year, m."releaseDate",
      m."indexingCohort", m."isFeaturette", m."updatedAt",
      MAX(r."updatedAt") AS "lastRatingAt"
    FROM "Rating" r
    JOIN "Movie" m ON m.id = r."movieId"
    WHERE r."userId" IS NOT NULL
      AND NOT m."isFeaturette"
    GROUP BY
      m.id, m.slug, m.title, m.genre, m.overview, m.year, m."releaseDate",
      m."indexingCohort", m."isFeaturette", m."updatedAt"
    ORDER BY MAX(r."updatedAt") DESC
  `
  for (const row of movies) {
    if (!shouldIncludeMovie(row)) continue
    push({
      url: `${BASE_URL}/movies/${row.slug ?? row.id}`,
      lastModified: maxDate([row.lastRatingAt, row.updatedAt]) ?? activityFallback,
      changeFrequency: "weekly",
      priority: 0.9,
    })
  }

  const pairs = await prisma.$queryRaw<SignedInPerfRow[]>`
    SELECT
      r."actorId",
      r."movieId",
      MAX(r."updatedAt") AS "lastRatingAt"
    FROM "Rating" r
    INNER JOIN "Movie" m ON m.id = r."movieId" AND NOT m."isFeaturette"
    WHERE r."userId" IS NOT NULL
    GROUP BY r."actorId", r."movieId"
    ORDER BY MAX(r."updatedAt") DESC
  `

  // Batch hydrate for rate URLs (eligibility only — do not change isRatePageIndexable).
  const BATCH = 500
  for (let i = 0; i < pairs.length; i += BATCH) {
    const slice = pairs.slice(i, i + BATCH)
    const actorIds = [...new Set(slice.map((p) => p.actorId))]
    const movieIds = [...new Set(slice.map((p) => p.movieId))]
    const [actorRows, movieRows] = await Promise.all([
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
    ])
    const actorMap = new Map(actorRows.map((a) => [a.id, a]))
    const movieMap = new Map(movieRows.map((m) => [m.id, m]))

    for (const pair of slice) {
      const actor = actorMap.get(pair.actorId)
      const movie = movieMap.get(pair.movieId)
      if (!actor || !movie) continue
      if (!isSitemapEligibleRateMovie(movie)) continue
      push({
        url: `${BASE_URL}/rate/${movie.slug ?? movie.id}/${actor.slug ?? actor.id}`,
        lastModified: pair.lastRatingAt,
        changeFrequency: "weekly",
        priority: 0.85,
      })
    }
  }

  if (urls.length > 50_000) {
    throw new Error(
      `priority.xml would exceed 50k URLs (${urls.length}). Split into chunks before shipping.`,
    )
  }

  writeXml(outDir, "priority.xml", buildUrlsetXml(urls))
  recordLastmod(lastmods, "priority.xml", urls)
  console.log(
    `    → ${urls.length} priority URL(s) (static+lists+signed-in actors/movies/performances)`,
  )
  return urls.length > 0 ? 1 : 0
}

/** Sitemap: ≥1 rating on non-featurette OR ≥5 performances on non-featurette. */
async function generateActors(
  outDir: string,
  lastmods: Record<string, string>,
): Promise<number> {
  const writer = new ChunkWriter(outDir, "actors", lastmods)
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
async function generateMovies(
  outDir: string,
  lastmods: Record<string, string>,
): Promise<number> {
  const writer = new ChunkWriter(outDir, "movies", lastmods)
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
 * Indexable rate URLs only (aligned with isRatePageIndexable + admin canonical tier):
 * - pairs with ≥2 community Ratings and a LEAD/SUPPORTING Performance
 * - plus curated homepage/performances targets (still subject to movie filters)
 *
 * Canonical tier uses pickCanonicalPerformanceSeoMeta (same order as admin DISTINCT ON).
 */
async function generatePerformances(
  outDir: string,
  lastmods: Record<string, string>,
): Promise<number> {
  const writer = new ChunkWriter(outDir, "performances", lastmods)
  const seen = new Set<string>()
  const writtenPaths = new Set<string>()
  let curatedSkippedMovie = 0
  let curatedSkippedSelf = 0
  let curatedSkippedIndexability = 0
  let bulkSkippedMovie = 0
  let bulkSkippedSelf = 0
  let bulkSkippedIndexability = 0
  const indexabilitySkipSamples: string[] = []

  const noteIndexabilitySkip = (
    source: "curated" | "bulk",
    label: string,
    reason: string,
  ) => {
    if (source === "curated") curatedSkippedIndexability += 1
    else bulkSkippedIndexability += 1
    if (indexabilitySkipSamples.length < 40) {
      indexabilitySkipSamples.push(`[${source}] ${label} (${reason})`)
    }
  }

  const curated = await resolveCuratedPerformancePairs()
  for (const c of curated) {
    const label = `${c.movie.title} (${c.movie.year}) / actorId=${c.actorId.slice(0, 8)}…`
    const pathHint = `/rate/${c.movie.slug ?? c.movie.id}/${c.actor.slug ?? c.actor.id}`
    if (!isSitemapEligibleRateMovie(c.movie)) {
      curatedSkippedMovie += 1
      continue
    }
    if (isSelfOnlyCreditPair(c.characters)) {
      curatedSkippedSelf += 1
      continue
    }
    const idxInput = {
      movieSlug: c.movie.slug,
      movieTitle: c.movie.title,
      indexingCohort: c.movie.indexingCohort,
      seededAggregateScore: c.seededAggregateScore,
      communityRatingCount: c.communityRatingCount,
      tier: c.tier,
    }
    if (!isRatePageIndexable(idxInput)) {
      noteIndexabilitySkip("curated", `${pathHint} | ${label}`, indexabilitySkipReason(idxInput))
      continue
    }
    const key = `${c.actorId}:${c.movieId}`
    if (seen.has(key)) continue
    seen.add(key)
    writtenPaths.add(pathHint)
    writer.push({
      url: `${BASE_URL}${pathHint}`,
      lastModified: c.maxUpd,
      changeFrequency: "weekly",
      priority: 0.7,
    })
  }
  console.log(
    `  performances: seeded ${seen.size} curated pair(s)` +
      ` (skipped movie=${curatedSkippedMovie} self=${curatedSkippedSelf} indexability=${curatedSkippedIndexability} of ${curated.length} curated lookups)`,
  )

  let lastActorId = ""
  let lastMovieId = ""
  let processed = 0
  let bulkAlreadySeen = 0

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
            AND p.tier IN ('LEAD', 'SUPPORTING')
        )
        GROUP BY r."actorId", r."movieId"
        HAVING COUNT(*) >= 2
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

    const [actors, movies, pairPerformances, ratingGroups] = await Promise.all([
      prisma.actor.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, slug: true, name: true },
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
          indexingCohort: true,
        },
      }),
      prisma.performance.findMany({
        where: {
          OR: pairs.map((p) => ({ actorId: p.actorId, movieId: p.movieId })),
        },
        select: {
          actorId: true,
          movieId: true,
          character: true,
          tier: true,
          seededAggregateScore: true,
          userId: true,
          order: true,
          createdAt: true,
        },
      }),
      prisma.rating.groupBy({
        by: ["actorId", "movieId"],
        where: { OR: pairs.map((p) => ({ actorId: p.actorId, movieId: p.movieId })) },
        _count: { _all: true },
      }),
    ])

    const ratingCountMap = new Map(
      ratingGroups.map((r) => [`${r.actorId}:${r.movieId}`, r._count._all]),
    )
    const perfRowsByPair = new Map<string, typeof pairPerformances>()
    for (const perf of pairPerformances) {
      const key = `${perf.actorId}:${perf.movieId}`
      const list = perfRowsByPair.get(key)
      if (list) list.push(perf)
      else perfRowsByPair.set(key, [perf])
    }
    const perfMetaByPair = new Map(
      [...perfRowsByPair.entries()].map(([key, rows]) => [
        key,
        pickCanonicalPerformanceSeoMeta(rows),
      ]),
    )

    const actorMap = new Map(actors.map((a) => [a.id, a]))
    const movieMap = new Map(movies.map((m) => [m.id, m]))

    for (const pair of pairs) {
      const key = `${pair.actorId}:${pair.movieId}`
      if (seen.has(key)) {
        bulkAlreadySeen += 1
        continue
      }

      const actor = actorMap.get(pair.actorId)
      const movie = movieMap.get(pair.movieId)
      if (!actor || !movie) continue
      const pathHint = `/rate/${movie.slug ?? movie.id}/${actor.slug ?? actor.id}`
      const label = `${actor.name} / ${movie.title} (${movie.year})`
      if (!isSitemapEligibleRateMovie(movie)) {
        bulkSkippedMovie += 1
        continue
      }
      const perfMeta = perfMetaByPair.get(key)
      if (isSelfOnlyCreditPair(perfMeta?.characters ?? [])) {
        bulkSkippedSelf += 1
        console.log(`  performances: skip selfCredit ${pathHint} | ${label}`)
        continue
      }
      const ratingCount = ratingCountMap.get(key) ?? 0
      const idxInput = {
        movieSlug: movie.slug,
        movieTitle: movie.title,
        indexingCohort: movie.indexingCohort,
        seededAggregateScore: perfMeta?.seededAggregateScore ?? null,
        communityRatingCount: ratingCount,
        tier: perfMeta?.tier ?? null,
      }
      if (!isRatePageIndexable(idxInput)) {
        noteIndexabilitySkip(
          "bulk",
          `${pathHint} | ${label} tier=${perfMeta?.tier ?? "null"} count=${ratingCount}`,
          indexabilitySkipReason(idxInput),
        )
        continue
      }

      seen.add(key)
      writtenPaths.add(pathHint)
      writer.push({
        url: `${BASE_URL}${pathHint}`,
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
      `  performances: processed ${processed.toLocaleString()} ≥2 LEAD/SUPPORTING pairs, unique URLs ${seen.size.toLocaleString()}...`,
    )
  }

  if (indexabilitySkipSamples.length > 0) {
    console.log(`  performances: indexability skips (up to 40):`)
    for (const line of indexabilitySkipSamples) {
      console.log(`    - ${line}`)
    }
  }

  const watchHits = WATCH_RATE_PATHS.filter((p) => writtenPaths.has(p))
  const watchMiss = WATCH_RATE_PATHS.filter((p) => !writtenPaths.has(p))
  console.log(
    `  performances: watchlist ${watchHits.length}/${WATCH_RATE_PATHS.length} present` +
      (watchMiss.length ? `; missing: ${watchMiss.join(", ")}` : ""),
  )

  const result = writer.finalize()
  console.log(
    `    → ${result.totalUrls} URLs across ${result.fileCount} file(s)` +
      ` (curated skips movie=${curatedSkippedMovie} self=${curatedSkippedSelf} indexability=${curatedSkippedIndexability};` +
      ` bulk skips movie=${bulkSkippedMovie} self=${bulkSkippedSelf} indexability=${bulkSkippedIndexability} alreadySeen=${bulkAlreadySeen})`,
  )
  return result.fileCount
}

async function writeManifest(
  outDir: string,
  counts: Omit<Manifest, "generatedAt" | "buildId">,
): Promise<void> {
  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    buildId: SITEMAP_BUILD_ID,
    sitemapLastmods: counts.sitemapLastmods ?? {},
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
    prioritySitemapCount = 0,
    actorSitemapCount,
    movieSitemapCount,
    performanceSitemapCount,
    listSitemapCount = 0,
    storySitemapCount = 0,
    newsSitemapCount = 0,
    sitemapLastmods = {},
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
  for (const slug of HUB_ENABLED_SLUGS) {
    const hubLoc = `${BASE_URL}/movies/${slug}/best-performances`
    const hubHits = staticXml.split(hubLoc).length - 1
    if (hubHits !== 1) {
      throw new Error(`static.xml: expected hub loc exactly once (${hubLoc}), found ${hubHits}`)
    }
  }

  const priorityPath = path.join(outDir, "priority.xml")
  if (prioritySitemapCount > 0) {
    if (!fs.existsSync(priorityPath)) throw new Error("Missing priority.xml")
    const priorityXml = fs.readFileSync(priorityPath, "utf-8")
    if (!priorityXml.includes("<urlset")) throw new Error("priority.xml: missing urlset")
    if (countUrlTags(priorityXml) < 1) throw new Error("priority.xml: empty urlset")
    if (!validateLocHosts(priorityXml)) throw new Error("priority.xml: invalid loc")
    for (const slug of HUB_ENABLED_SLUGS) {
      const hubLoc = `${BASE_URL}/movies/${slug}/best-performances`
      if (!priorityXml.includes(`<loc>${hubLoc}</loc>`)) {
        throw new Error(`priority.xml: missing hub loc ${hubLoc}`)
      }
    }
    if (!sitemapLastmods["priority.xml"]) {
      throw new Error("manifest.sitemapLastmods missing priority.xml")
    }
  } else if (fs.existsSync(priorityPath)) {
    throw new Error("Unexpected priority.xml when prioritySitemapCount is 0")
  }

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
    /^(_manifest\.json|priority\.xml|static\.xml|lists\.xml|stories\.xml|news\.xml|(actors|movies|performances)-\d+\.xml)$/
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

async function siteSignedInActivityFallback(): Promise<Date> {
  const rows = await prisma.$queryRaw<Array<{ max: Date | null }>>`
    SELECT MAX("updatedAt") AS max FROM "Rating" WHERE "userId" IS NOT NULL
  `
  return rows[0]?.max ?? new Date(0)
}

async function generateAllInto(outDir: string): Promise<void> {
  rmrf(outDir)
  ensureDir(outDir)

  const t0 = Date.now()
  console.log(`[sitemap] Generating into ${outDir} (BASE_URL=${BASE_URL}, CHUNK_SIZE=${CHUNK_SIZE})…`)

  const sitemapLastmods: Record<string, string> = {}
  const activityFallback = await siteSignedInActivityFallback()

  const prioritySitemapCount = await generatePriority(outDir, sitemapLastmods, activityFallback)
  generateStatic(outDir, sitemapLastmods, activityFallback)
  const actorSitemapCount = await generateActors(outDir, sitemapLastmods)
  const movieSitemapCount = await generateMovies(outDir, sitemapLastmods)
  const performanceSitemapCount = await generatePerformances(outDir, sitemapLastmods)
  const listSitemapCount = generateLists(outDir, sitemapLastmods)
  const storySitemapCount = await generateEditorial(
    outDir,
    "stories",
    "/stories",
    "stories.xml",
    sitemapLastmods,
  )
  const newsSitemapCount = await generateEditorial(
    outDir,
    "news",
    "/news",
    "news.xml",
    sitemapLastmods,
  )

  await writeManifest(outDir, {
    prioritySitemapCount,
    actorSitemapCount,
    movieSitemapCount,
    performanceSitemapCount,
    listSitemapCount,
    storySitemapCount,
    newsSitemapCount,
    sitemapLastmods,
  })

  validateGeneratedSet(outDir)

  const ms = Date.now() - t0
  console.log(`[sitemap] Generation + validation finished in ${ms}ms`)
  console.log(
    `[sitemap] Counts: priority=${prioritySitemapCount}, actors=${actorSitemapCount} files, movies=${movieSitemapCount} files, performances=${performanceSitemapCount} files, lists=${listSitemapCount}, stories=${storySitemapCount}, news=${newsSitemapCount}`,
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
    const sitemapLastmods: Record<string, string> = {}
    const activityFallback = await siteSignedInActivityFallback()
    const pr = await generatePriority(LIVE_DIR, sitemapLastmods, activityFallback)
    generateStatic(LIVE_DIR, sitemapLastmods, activityFallback)
    const a = await generateActors(LIVE_DIR, sitemapLastmods)
    const m = await generateMovies(LIVE_DIR, sitemapLastmods)
    const p = await generatePerformances(LIVE_DIR, sitemapLastmods)
    const l = generateLists(LIVE_DIR, sitemapLastmods)
    const s = await generateEditorial(
      LIVE_DIR,
      "stories",
      "/stories",
      "stories.xml",
      sitemapLastmods,
    )
    const n = await generateEditorial(LIVE_DIR, "news", "/news", "news.xml", sitemapLastmods)
    await writeManifest(LIVE_DIR, {
      prioritySitemapCount: pr,
      actorSitemapCount: a,
      movieSitemapCount: m,
      performanceSitemapCount: p,
      listSitemapCount: l,
      storySitemapCount: s,
      newsSitemapCount: n,
      sitemapLastmods,
    })
    validateGeneratedSet(LIVE_DIR)
    console.log("Done (partial / dev mode).")
    return
  }

  const started = Date.now()
  console.log(`[sitemap] === START full atomic generation at ${new Date().toISOString()} (${deployFingerprint()}) ===`)

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
