/**
 * Read-only verification for movie ingestion: cast size, tier counts, order contiguity, tier correctness.
 * Usage: npx tsx scripts/verify-movie-ingestion.ts "Movie Title" [year]
 * Example: npx tsx scripts/verify-movie-ingestion.ts "Avengers: Endgame" 2019
 */

import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { SYSTEM_USER_ID } from "../src/lib/movie-ingestion";
import { computePerformanceTier } from "../src/lib/performance-tier";

const prisma = new PrismaClient();

async function main() {
  const titleArg = process.argv[2];
  const yearArg = process.argv[3];
  if (!titleArg) {
    console.error("Usage: npx tsx scripts/verify-movie-ingestion.ts \"Movie Title\" [year]");
    process.exit(1);
  }
  const year = yearArg ? parseInt(yearArg, 10) : undefined;
  await run(titleArg, year);
}

async function run(titleFilter: string, year?: number) {
  const where: { title?: { contains: string; mode: "insensitive" }; year?: number } = {
    title: { contains: titleFilter, mode: "insensitive" },
  };
  if (year !== undefined && !Number.isNaN(year)) where.year = year;

  const movie = await prisma.movie.findFirst({
    where,
    select: {
      id: true,
      title: true,
      year: true,
      performances: {
        where: { userId: SYSTEM_USER_ID },
        select: { order: true, tier: true, actor: { select: { name: true } } },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!movie) {
    console.log(`No movie found matching: "${titleFilter}"${year != null ? ` (year=${year})` : ""}`);
    process.exit(1);
  }

  const performances = movie.performances;
  const castSize = performances.length;

  if (castSize === 0) {
    console.log("No system-ingested performances for this movie (userId=SYSTEM_USER_ID). Run ingestion first or check another movie.");
    process.exit(0);
  }

  const byTier = performances.reduce(
    (acc, p) => {
      acc[p.tier] = (acc[p.tier] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log(`\nMovie: ${movie.title} (${movie.year})`);
  console.log(`castSize: ${castSize}`);
  console.log("Tier counts: LEAD=%s SUPPORTING=%s MINOR=%s", byTier.LEAD ?? 0, byTier.SUPPORTING ?? 0, byTier.MINOR ?? 0);
  console.log("\nFirst 10 actors (order, tier, name):");
  performances.slice(0, 10).forEach((p) => {
    console.log(`  ${p.order} ${p.tier} ${p.actor.name}`);
  });

  // Assert: order is contiguous starting at 0
  const orders = performances.map((p) => p.order).filter((o) => o != null) as number[];
  const expectedOrders = Array.from({ length: castSize }, (_, i) => i);
  const orderSet = new Set(orders);
  const missing = expectedOrders.filter((i) => !orderSet.has(i));
  const extra = orders.filter((i) => i < 0 || i >= castSize);
  if (missing.length > 0 || extra.length > 0) {
    console.error("\nAssert failed: order must be contiguous 0..castSize-1");
    if (missing.length) console.error("  Missing orders:", missing);
    if (extra.length) console.error("  Out-of-range orders:", extra);
    process.exit(1);
  }

  // Assert: tier matches computePerformanceTier(order, castSize)
  let tierMismatch = false;
  for (const p of performances) {
    if (p.order == null) continue;
    const expected = computePerformanceTier(p.order, castSize);
    if (p.tier !== expected) {
      console.error(`\nAssert failed: order=${p.order} has tier=${p.tier}, expected ${expected} (castSize=${castSize})`);
      tierMismatch = true;
    }
  }
  if (tierMismatch) process.exit(1);

  console.log("\nOK: order contiguous 0..%s, tier matches computePerformanceTier(order, castSize).", castSize - 1);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
