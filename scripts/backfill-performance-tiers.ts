/**
 * Backfill script: recompute order and tier for existing Performance records.
 *
 * For each movie with tmdbId we fetch credits, match performances to cast order
 * by actor name, then set order + tier (ensemble-aware). Run after adding the
 * PerformanceTier enum and order/tier fields to the schema.
 *
 * Usage:
 *   npx ts-node scripts/backfill-performance-tiers.ts
 *   npx ts-node scripts/backfill-performance-tiers.ts --movie=Dune --dry
 *   npx ts-node scripts/backfill-performance-tiers.ts --year=2024
 */

import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { getMovieCredits } from "../src/lib/tmdb";
import { computePerformanceTier } from "../src/lib/performance-tier";

const prisma = new PrismaClient();

type Args = {
  movie?: string;
  year?: number;
  dryRun?: boolean;
};

function parseArgs(): Args {
  const args: Args = {};
  for (const raw of process.argv.slice(2)) {
    const [k, v] = raw.split("=");
    if (k === "--movie") args.movie = v;
    else if (k === "--year") args.year = Number(v);
    else if (k === "--dry") args.dryRun = true;
  }
  return args;
}

function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function backfill(): Promise<void> {
  if (!process.env.TMDB_API_KEY) {
    console.error("❌ Missing TMDB_API_KEY in .env");
    process.exit(1);
  }
  const { movie: movieFilter, year: yearFilter, dryRun } = parseArgs();

  console.log("Starting performance tier backfill...");
  if (movieFilter)
    console.log(
      `  • Filter: title contains "${movieFilter}"${yearFilter ? `, year=${yearFilter}` : ""}`
    );
  if (dryRun) console.log("  • DRY RUN (no database updates)");

  const movies = await prisma.movie.findMany({
    where: {
      tmdbId: { not: null },
      ...(movieFilter
        ? {
            title: { contains: movieFilter, mode: "insensitive" },
            ...(yearFilter ? { year: yearFilter } : {}),
          }
        : {}),
      performances: { some: {} },
    },
    select: {
      id: true,
      title: true,
      year: true,
      tmdbId: true,
      performances: {
        select: {
          id: true,
          order: true,
          tier: true,
          actor: { select: { name: true } },
        },
      },
    },
    orderBy: { year: "asc" },
  });

  if (movies.length === 0) {
    console.log("No movies found with TMDB id and performances.");
    return;
  }

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (let i = 0; i < movies.length; i++) {
    const m = movies[i];
    if (!m.tmdbId) continue;

    let credits;
    try {
      credits = await getMovieCredits(m.tmdbId);
    } catch (e) {
      console.warn(
        `  ! Failed to fetch credits for ${m.title} (${m.year}) TMDB ${m.tmdbId}:`,
        (e as Error)?.message
      );
      totalSkipped += m.performances.length;
      await sleep(500);
      continue;
    }

    const castSize = credits.cast.length;
    const nameToOrder = new Map<string, number>();
    credits.cast.forEach((c, index) => {
      const key = normalizeName(c.name);
      if (key && !nameToOrder.has(key)) nameToOrder.set(key, index);
    });

    let movieUpdated = 0;
    for (const perf of m.performances) {
      const actorNameKey = normalizeName(perf.actor?.name ?? "");
      const order = nameToOrder.get(actorNameKey);
      if (order === undefined) {
        totalSkipped += 1;
        continue;
      }
      const tier = computePerformanceTier(order, castSize);
      if (perf.order === order && perf.tier === tier) continue;

      if (!dryRun) {
        try {
          await prisma.performance.update({
            where: { id: perf.id },
            data: { order, tier },
          });
          movieUpdated += 1;
          totalUpdated += 1;
        } catch (e) {
          console.warn(`  ! Failed to update Performance ${perf.id}:`, (e as Error)?.message);
        }
      } else {
        movieUpdated += 1;
        totalUpdated += 1;
      }
    }

    if (movieUpdated > 0) {
      console.log(
        `[${i + 1}/${movies.length}] ${m.title} (${m.year}): ${movieUpdated} performance(s) updated`
      );
    }
    await sleep(500);
  }

  console.log("\nBackfill complete.");
  console.log(`  • Movies processed: ${movies.length}`);
  console.log(`  • Performances updated: ${totalUpdated}`);
  if (totalSkipped > 0) console.log(`  • Skipped (no cast match): ${totalSkipped}`);
}

backfill()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
