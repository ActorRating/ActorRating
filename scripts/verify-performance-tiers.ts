/**
 * One-off verification: tier distribution for an ensemble movie.
 * Usage: npx tsx scripts/verify-performance-tiers.ts [movieTitle]
 * Default: "Avengers: Endgame"
 */

import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const titleFilter = process.argv[2] ?? "Avengers: Endgame";
  const movie = await prisma.movie.findFirst({
    where: { title: { contains: titleFilter, mode: "insensitive" } },
    select: {
      id: true,
      title: true,
      year: true,
      _count: { select: { performances: true } },
      performances: {
        select: {
          order: true,
          tier: true,
          actor: { select: { name: true } },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!movie) {
    console.log(`No movie found matching: ${titleFilter}`);
    process.exit(1);
  }

  const byTier = movie.performances.reduce(
    (acc, p) => {
      acc[p.tier] = (acc[p.tier] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log(`\nMovie: ${movie.title} (${movie.year})`);
  console.log(`Total performances: ${movie._count.performances}\n`);
  console.log("Tier distribution:");
  console.log("  LEAD:", byTier.LEAD ?? 0);
  console.log("  SUPPORTING:", byTier.SUPPORTING ?? 0);
  console.log("  MINOR:", byTier.MINOR ?? 0);
  console.log("\nSample (first 20 by order):");
  movie.performances.slice(0, 20).forEach((p) => {
    console.log(`  order=${p.order} tier=${p.tier} ${p.actor.name}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
