/**
 * Flag movies as featurettes (making-of, behind the scenes, etc.)
 * so they stay in the DB but are hidden from rating, movie pages, and actor filmographies.
 *
 * Run: npx tsx scripts/mark-featurettes.ts
 */

import { PrismaClient } from "@prisma/client";
import { FEATURETTE_TITLE_INCLUDES, matchesFeaturetteTitle } from "../src/lib/non-rateable";

const prisma = new PrismaClient();

async function main() {
  // Broad SQL prefilter via contains, then precise shared matcher.
  const candidates = await prisma.movie.findMany({
    where: {
      isFeaturette: false,
      OR: FEATURETTE_TITLE_INCLUDES.map((p) => ({
        title: { contains: p, mode: "insensitive" as const },
      })),
    },
    select: { id: true, title: true },
  });

  const ids = candidates
    .filter((m) => matchesFeaturetteTitle(m.title))
    .map((m) => m.id);

  if (ids.length === 0) {
    console.log("No new featurettes to flag");
    return;
  }

  // Chunk updates to avoid oversized IN lists
  const chunkSize = 500;
  let flagged = 0;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const updated = await prisma.movie.updateMany({
      where: { id: { in: chunk } },
      data: { isFeaturette: true },
    });
    flagged += updated.count;
  }

  console.log(`Flagged ${flagged} movies as featurettes`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
