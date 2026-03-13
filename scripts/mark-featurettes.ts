/**
 * One-time script: flag movies as featurettes (making-of, behind the scenes, etc.)
 * so they can be hidden from rating flow, search, and stats.
 *
 * Run: npx tsx scripts/mark-featurettes.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PATTERNS = [
  "making of",
  "behind the scenes",
  "featurette",
  "interview",
  "promo",
  "trailer",
];

async function main() {
  const updated = await prisma.movie.updateMany({
    where: {
      OR: PATTERNS.map((p) => ({
        title: { contains: p, mode: "insensitive" as const },
      })),
    },
    data: { isFeaturette: true },
  });

  console.log(`Flagged ${updated.count} movies as featurettes`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
