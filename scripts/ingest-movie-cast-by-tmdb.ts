/**
 * Ingest full TMDB cast for one movie by tmdbId, then seed aggregate scores
 * if the movie is in an indexing cohort with a valid TMDB rating.
 *
 * Usage:
 *   npx tsx scripts/ingest-movie-cast-by-tmdb.ts --tmdb-id=496243
 *   npx tsx scripts/ingest-movie-cast-by-tmdb.ts --tmdb-id=496243 --dry-run
 */
import dotenv from "dotenv"
dotenv.config()

import { PrismaClient } from "@prisma/client"
import { ingestMovieCast } from "../src/lib/movie-ingestion"

const MIN_VOTE_COUNT = 20
const prisma = new PrismaClient()

function parseArgs(argv: string[]) {
  let tmdbId: number | null = null
  let dryRun = false
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true
    else if (a.startsWith("--tmdb-id=")) tmdbId = parseInt(a.slice("--tmdb-id=".length), 10)
  }
  if (tmdbId == null || !Number.isFinite(tmdbId)) {
    throw new Error("Required: --tmdb-id=<number>")
  }
  return { tmdbId, dryRun }
}

async function main() {
  const { tmdbId, dryRun } = parseArgs(process.argv.slice(2))
  const movie = await prisma.movie.findFirst({
    where: { tmdbId },
    select: {
      id: true,
      title: true,
      year: true,
      tmdbRating: true,
      tmdbVoteCount: true,
      indexingCohort: true,
      _count: { select: { performances: true } },
    },
  })
  if (!movie) {
    throw new Error(`No movie with tmdbId=${tmdbId}`)
  }

  console.log(
    `[ingest-one] ${movie.title} (${movie.year}) id=${movie.id} performances=${movie._count.performances} cohort=${movie.indexingCohort ?? 0}`,
  )

  if (dryRun) {
    console.log("[ingest-one] dry-run — no writes")
    return
  }

  const result = await ingestMovieCast(prisma, movie.id, {
    log: (msg) => console.log(`  ${msg}`),
  })
  console.log(
    `[ingest-one] cast: actorsCreated=${result.actorsCreated} performancesCreated=${result.performancesCreated} performancesUpdated=${result.performancesUpdated}`,
  )

  if (
    movie.indexingCohort != null &&
    movie.indexingCohort >= 1 &&
    movie.tmdbRating != null &&
    (movie.tmdbVoteCount ?? 0) >= MIN_VOTE_COUNT
  ) {
    const seeded = await prisma.performance.updateMany({
      where: { movieId: movie.id },
      data: { seededAggregateScore: movie.tmdbRating },
    })
    console.log(
      `[ingest-one] seededAggregateScore=${movie.tmdbRating} on ${seeded.count} performances`,
    )
  } else {
    console.log("[ingest-one] skip seed (not cohort-eligible or missing TMDB votes)")
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
