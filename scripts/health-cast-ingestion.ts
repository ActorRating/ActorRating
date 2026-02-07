/**
 * Health check: movies with tmdbId but zero performances.
 * After a full ingest run, this should return 0 rows.
 *
 * Usage: npx tsx scripts/health-cast-ingestion.ts
 */

import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const moviesWithTmdbButNoPerformances = await prisma.movie.findMany({
    where: {
      tmdbId: { not: null },
      performances: { none: {} },
    },
    select: { id: true, title: true, year: true, tmdbId: true },
    orderBy: [{ year: "asc" }, { title: "asc" }],
  });

  const count = moviesWithTmdbButNoPerformances.length;
  console.log(`Movies with tmdbId but 0 performances: ${count}`);
  if (count === 0) {
    console.log("OK — no rows. Full cast ingestion has run for all TMDB-linked movies.");
    return;
  }
  console.log("Sample (first 20):");
  moviesWithTmdbButNoPerformances.slice(0, 20).forEach((m) => {
    console.log(`  ${m.id} | ${m.title} (${m.year}) tmdbId=${m.tmdbId}`);
  });
  if (count > 20) console.log(`  ... and ${count - 20} more`);
  process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
