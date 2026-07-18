/**
 * Seed Performance.seededAggregateScore from parent Movie.tmdbRating.
 *
 * Scoped to SEO cohort movies only (Movie.indexingCohort = N, or auto-detect
 * movies with tmdbDataFetchedAt set when --mark-cohort=N is passed).
 *
 * Never invents per-performance scores — copies the movie TMDB vote_average.
 * Requires Movie.tmdbVoteCount >= MIN_VOTE_COUNT (default 20).
 *
 * Usage:
 *   npx tsx scripts/seed-aggregate-scores.ts --cohort=1 --mark-from-tmdb-fetch
 *   npx tsx scripts/seed-aggregate-scores.ts --cohort=1 --dry-run
 */
import { prisma } from "../src/lib/prisma"

const MIN_VOTE_COUNT = 20

function parseArgs(argv: string[]) {
  let cohort = 1
  let dryRun = false
  let markFromTmdbFetch = false
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true
    else if (a === "--mark-from-tmdb-fetch") markFromTmdbFetch = true
    else if (a.startsWith("--cohort=")) cohort = parseInt(a.slice("--cohort=".length), 10)
  }
  if (!Number.isFinite(cohort) || cohort < 1) {
    throw new Error("Invalid --cohort= (must be integer >= 1)")
  }
  return { cohort, dryRun, markFromTmdbFetch }
}

async function main() {
  const { cohort, dryRun, markFromTmdbFetch } = parseArgs(process.argv.slice(2))
  console.log(`[seed-agg] cohort=${cohort} dryRun=${dryRun} markFromTmdbFetch=${markFromTmdbFetch}`)
  console.log(`[seed-agg] min vote_count=${MIN_VOTE_COUNT}`)

  if (markFromTmdbFetch) {
    if (dryRun) {
      const wouldMark = await prisma.movie.count({
        where: {
          tmdbDataFetchedAt: { not: null },
          tmdbRating: { not: null },
          tmdbVoteCount: { gte: MIN_VOTE_COUNT },
        },
      })
      console.log(`[seed-agg] dry-run would mark indexingCohort=${cohort} on ${wouldMark} movies`)
    } else {
      const marked = await prisma.movie.updateMany({
        where: {
          tmdbDataFetchedAt: { not: null },
          tmdbRating: { not: null },
          tmdbVoteCount: { gte: MIN_VOTE_COUNT },
        },
        data: { indexingCohort: cohort },
      })
      console.log(`[seed-agg] marked indexingCohort=${cohort} on ${marked.count} movies`)
    }
  }

  const cohortMovies = await prisma.movie.findMany({
    where: {
      indexingCohort: cohort,
      tmdbRating: { not: null },
      tmdbVoteCount: { gte: MIN_VOTE_COUNT },
    },
    select: { id: true, title: true, year: true, tmdbRating: true, tmdbVoteCount: true },
  })

  console.log(`[seed-agg] cohort movies eligible: ${cohortMovies.length}`)

  if (cohortMovies.length === 0) {
    console.error(
      "[seed-agg] No cohort movies found. Run with --mark-from-tmdb-fetch after TMDB backfill, or set Movie.indexingCohort manually.",
    )
    process.exit(1)
  }

  let updated = 0
  for (const movie of cohortMovies) {
    if (movie.tmdbRating == null) continue
    if (dryRun) {
      const count = await prisma.performance.count({ where: { movieId: movie.id } })
      updated += count
      console.log(
        `[seed-agg] dry-run ${movie.title} (${movie.year}): would set ${count} performances → ${movie.tmdbRating}`,
      )
      continue
    }
    const result = await prisma.performance.updateMany({
      where: { movieId: movie.id },
      data: { seededAggregateScore: movie.tmdbRating },
    })
    updated += result.count
    console.log(
      `[seed-agg] ${movie.title} (${movie.year}): ${result.count} performances → ${movie.tmdbRating} (votes ${movie.tmdbVoteCount})`,
    )
  }

  console.log("\n========== SEEDED AGGREGATE SUMMARY ==========")
  console.log(`  Cohort:                    ${cohort}`)
  console.log(`  Eligible cohort movies:    ${cohortMovies.length}`)
  console.log(`  ${dryRun ? "Would update performances" : "Performances updated"}: ${updated}`)
  console.log("==============================================\n")
}

main()
  .catch((err) => {
    console.error("[seed-agg] FATAL:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
