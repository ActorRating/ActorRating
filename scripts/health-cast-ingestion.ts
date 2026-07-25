/**
 * Health check for cast ingestion queue.
 *
 * Reports:
 * 1) Movies still queued (tmdbId set, non-featurette, castIngestedAt null)
 * 2) Movies with tmdbId but zero performances (may include TMDB-404 marked done)
 *
 * Usage: npx tsx scripts/health-cast-ingestion.ts
 */

import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const queued = await prisma.movie.findMany({
    where: {
      tmdbId: { not: null },
      isFeaturette: false,
      castIngestedAt: null,
    },
    select: { id: true, title: true, year: true, tmdbId: true },
    orderBy: [{ year: "asc" }, { title: "asc" }],
  });

  const noPerformances = await prisma.movie.count({
    where: {
      tmdbId: { not: null },
      performances: { none: {} },
    },
  });

  const markedDoneNoCast = await prisma.movie.count({
    where: {
      tmdbId: { not: null },
      castIngestedAt: { not: null },
      performances: { none: {} },
    },
  });

  console.log(`Ingest queue (castIngestedAt null, non-featurette): ${queued.length}`);
  console.log(`Movies with tmdbId but 0 performances: ${noPerformances}`);
  console.log(`  of which marked castIngestedAt (404/empty/featurette): ${markedDoneNoCast}`);

  if (queued.length === 0) {
    console.log("OK — ingest queue empty.");
    return;
  }

  console.log("Queued sample (first 20):");
  queued.slice(0, 20).forEach((m) => {
    console.log(`  ${m.id} | ${m.title} (${m.year}) tmdbId=${m.tmdbId}`);
  });
  if (queued.length > 20) console.log(`  ... and ${queued.length - 20} more`);
  process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
