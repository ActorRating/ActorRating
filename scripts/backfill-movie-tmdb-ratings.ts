/**
 * Backfill Movie.tmdbRating / tmdbVoteCount / tmdbDataFetchedAt from TMDB.
 *
 * Scoped to scripts/data/seo-cohort-1-movies.json ONLY — never the full catalog.
 *
 * Usage:
 *   npx tsx scripts/backfill-movie-tmdb-ratings.ts
 *   npx tsx scripts/backfill-movie-tmdb-ratings.ts --dry-run
 *   npx tsx scripts/backfill-movie-tmdb-ratings.ts --cohort=scripts/data/seo-cohort-1-movies.json
 *
 * Requires: DATABASE_URL, TMDB_API_KEY
 * Apply migration first: npx prisma migrate deploy
 */
import fs from "fs"
import path from "path"
import { prisma } from "../src/lib/prisma"
import { getMovieDetails, rateLimitTmdb } from "../src/lib/tmdb"

type CohortEntry = {
  tmdbId?: number
  slug?: string
  title?: string
  year?: number
}

type CohortFile = {
  description?: string
  movies: CohortEntry[]
}

const DEFAULT_COHORT = path.join(__dirname, "data", "seo-cohort-1-movies.json")
/** Extra pause after every N successful TMDB fetches (on top of per-request rateLimitTmdb). */
const BATCH_SIZE = 20
const BATCH_PAUSE_MS = 1500
const PROGRESS_EVERY = 100

function parseArgs(argv: string[]) {
  let cohortPath = DEFAULT_COHORT
  let dryRun = false
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true
    else if (a.startsWith("--cohort=")) cohortPath = a.slice("--cohort=".length)
  }
  return { cohortPath, dryRun }
}

function loadCohort(filePath: string): CohortEntry[] {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
  if (!fs.existsSync(abs)) {
    throw new Error(`Cohort file not found: ${abs}`)
  }
  const raw = JSON.parse(fs.readFileSync(abs, "utf8")) as CohortFile
  if (!Array.isArray(raw.movies)) {
    throw new Error(`Cohort file must have a "movies" array: ${abs}`)
  }
  return raw.movies
}

async function resolveMovie(entry: CohortEntry) {
  if (entry.tmdbId != null) {
    const byTmdb = await prisma.movie.findFirst({
      where: { tmdbId: entry.tmdbId },
      select: { id: true, title: true, year: true, slug: true, tmdbId: true, tmdbRating: true, tmdbVoteCount: true },
    })
    if (byTmdb) return byTmdb
  }
  if (entry.slug) {
    const bySlug = await prisma.movie.findFirst({
      where: { slug: entry.slug },
      select: { id: true, title: true, year: true, slug: true, tmdbId: true, tmdbRating: true, tmdbVoteCount: true },
    })
    if (bySlug) return bySlug
  }
  if (entry.title && entry.year != null) {
    const byTitle = await prisma.movie.findFirst({
      where: { title: entry.title, year: entry.year },
      select: { id: true, title: true, year: true, slug: true, tmdbId: true, tmdbRating: true, tmdbVoteCount: true },
    })
    if (byTitle) return byTitle
  }
  return null
}

async function main() {
  const { cohortPath, dryRun } = parseArgs(process.argv.slice(2))
  const entries = loadCohort(cohortPath)

  console.log(`[tmdb-backfill] cohort file: ${cohortPath}`)
  console.log(`[tmdb-backfill] entries: ${entries.length}`)
  console.log(`[tmdb-backfill] dryRun: ${dryRun}`)

  if (entries.length === 0) {
    console.error(
      "[tmdb-backfill] Cohort list is empty. Add movies to scripts/data/seo-cohort-1-movies.json, then re-run.",
    )
    process.exit(1)
  }

  if (!process.env.TMDB_API_KEY) {
    console.error("[tmdb-backfill] TMDB_API_KEY is not set")
    process.exit(1)
  }

  let resolved = 0
  let missingInDb = 0
  let missingTmdbId = 0
  let fetchFailed = 0
  let updated = 0
  let skippedUnchanged = 0
  let processed = 0
  let fetchesSinceBatchPause = 0

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const label =
      entry.slug ||
      (entry.tmdbId != null ? `tmdb:${entry.tmdbId}` : null) ||
      (entry.title && entry.year != null ? `${entry.title} (${entry.year})` : `entry[${i}]`)

    const movie = await resolveMovie(entry)
    if (!movie) {
      missingInDb++
      console.warn(`[tmdb-backfill] NOT IN DB: ${label}`)
      continue
    }
    resolved++

    if (movie.tmdbId == null) {
      missingTmdbId++
      console.warn(`[tmdb-backfill] NO tmdbId: ${movie.title} (${movie.year}) slug=${movie.slug}`)
      continue
    }

    // Explicit per-call throttle (getMovieDetails also rate-limits)
    await rateLimitTmdb()
    const details = await getMovieDetails(movie.tmdbId)
    fetchesSinceBatchPause++

    if (fetchesSinceBatchPause >= BATCH_SIZE) {
      await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS))
      fetchesSinceBatchPause = 0
    }

    if (!details || details.voteAverage == null || details.voteCount == null) {
      fetchFailed++
      console.warn(`[tmdb-backfill] TMDB FETCH FAILED: ${movie.title} (${movie.year}) tmdbId=${movie.tmdbId}`)
      continue
    }

    const same =
      movie.tmdbRating === details.voteAverage && movie.tmdbVoteCount === details.voteCount

    if (same) {
      skippedUnchanged++
    } else if (!dryRun) {
      await prisma.movie.update({
        where: { id: movie.id },
        data: {
          tmdbRating: details.voteAverage,
          tmdbVoteCount: details.voteCount,
          tmdbDataFetchedAt: new Date(),
        },
      })
      updated++
    } else {
      updated++ // would-update count in dry-run
    }

    processed++
    if (processed % PROGRESS_EVERY === 0) {
      console.log(
        `[tmdb-backfill] progress: processed=${processed}/${entries.length} updated=${updated} missingInDb=${missingInDb} fetchFailed=${fetchFailed}`,
      )
    }
  }

  console.log("\n========== COHORT 1 TMDB BACKFILL SUMMARY ==========")
  console.log(`  Cohort entries:     ${entries.length}`)
  console.log(`  Resolved in DB:     ${resolved}`)
  console.log(`  Missing in DB:      ${missingInDb}`)
  console.log(`  Missing tmdbId:     ${missingTmdbId}`)
  console.log(`  TMDB fetch failed:  ${fetchFailed}`)
  console.log(`  ${dryRun ? "Would update" : "Updated"}:          ${updated}`)
  console.log(`  Unchanged (skip):   ${skippedUnchanged}`)
  console.log("====================================================\n")
}

main()
  .catch((err) => {
    console.error("[tmdb-backfill] FATAL:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
