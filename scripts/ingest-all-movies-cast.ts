/**
 * Bulk full-cast ingestion: run ingestMovieCast for movies that need it.
 * Fetches FULL TMDB credits per movie and creates/updates performances. Idempotent.
 *
 * Default: movies with tmdbId that have never completed cast ingest (castIngestedAt null),
 * excluding featurettes. TMDB 404s and empty casts set castIngestedAt so they leave the queue.
 *
 * Usage: npx tsx scripts/ingest-all-movies-cast.ts           # only missing cast
 *        npx tsx scripts/ingest-all-movies-cast.ts --all    # every movie (full refresh)
 *        npx tsx scripts/ingest-all-movies-cast.ts --limit 100
 *        npx tsx scripts/ingest-all-movies-cast.ts --dry
 *
 * Rate-limited via getMovieCreditsForIngestion. Sequential; no parallel TMDB calls.
 */

import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { ingestMovieCast } from "../src/lib/movie-ingestion";

const prisma = new PrismaClient();

async function main() {
  const limitIdx = process.argv.indexOf("--limit");
  const limit = limitIdx !== -1 && process.argv[limitIdx + 1]
    ? parseInt(process.argv[limitIdx + 1], 10)
    : undefined;
  const dryRun = process.argv.includes("--dry");
  const fullRefresh = process.argv.includes("--all");

  const where = fullRefresh
    ? { tmdbId: { not: null }, isFeaturette: false }
    : {
        tmdbId: { not: null },
        isFeaturette: false,
        castIngestedAt: null,
      };

  const movies = await prisma.movie.findMany({
    where,
    select: { id: true, title: true, year: true, tmdbId: true },
    orderBy: { year: "asc" },
    ...(limit ? { take: limit } : {}),
  });

  console.log(
    `Movies to process: ${movies.length}${limit ? ` (limit ${limit})` : ""}${fullRefresh ? " [--all full refresh]" : " [castIngestedAt null, non-featurette]"}`
  );
  if (dryRun) {
    console.log("DRY RUN — no writes");
    return;
  }

  let totalActorsCreated = 0;
  let totalPerformancesCreated = 0;
  let totalPerformancesUpdated = 0;
  let errors = 0;
  let tmdb404s = 0;

  for (let i = 0; i < movies.length; i++) {
    const m = movies[i];
    try {
      const result = await ingestMovieCast(prisma, m.id, {
        log: (msg) => {
          if (msg.includes("TMDB 404")) {
            tmdb404s += 1;
            console.warn(`[${i + 1}/${movies.length}] ${msg}`);
          }
        },
      });
      totalActorsCreated += result.actorsCreated;
      totalPerformancesCreated += result.performancesCreated;
      totalPerformancesUpdated += result.performancesUpdated;
      if ((i + 1) % 100 === 0 || i === 0) {
        console.log(`[${i + 1}/${movies.length}] ${m.title} (${m.year}) — created: ${result.performancesCreated}, updated: ${result.performancesUpdated}`);
      }
    } catch (e) {
      errors += 1;
      console.error(
        `[${i + 1}/${movies.length}] ${m.title} (${m.year}) tmdbId=${m.tmdbId}:`,
        (e as Error).message,
      );
    }
  }

  console.log("\nDone.");
  console.log("  Actors created:", totalActorsCreated);
  console.log("  Performances created:", totalPerformancesCreated);
  console.log("  Performances updated:", totalPerformancesUpdated);
  if (tmdb404s) console.log("  TMDB 404s marked done:", tmdb404s);
  if (errors) console.log("  Errors:", errors);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
