/**
 * Remove known adult performers (actors) from the database.
 * Deleting an Actor cascades to Performance and Rating.
 *
 * List: Deborah Révy, Nao Saejima, Kaori Asô, Joo Ah, Kim Do-hee, Yoon Yool, Min Do-yoon
 *
 * Usage:
 *   npx tsx scripts/remove-adult-performers.ts         # dry run
 *   npx tsx scripts/remove-adult-performers.ts --yes   # delete
 */

import { prisma } from "../src/lib/prisma";

const ADULT_PERFORMER_NAMES = [
  "Deborah Révy",
  "Déborah Révy",
  "Deborah Revy",
  "Nao Saejima",
  "Kaori Asô",
  "Kaori Aso",
  "Joo Ah",
  "Kim Do-hee",
  "Yoon Yool",
  "Min Do-yoon",
];

/** Normalize for comparison: lowercase, trim, remove accents (é -> e, etc.) */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

async function main() {
  const doDelete = process.argv.includes("--yes");
  console.log("Removing known adult performers (actors)");
  console.log(doDelete ? "Mode: DELETE (--yes)" : "Mode: DRY RUN (use --yes to delete)\n");

  const allActors = await prisma.actor.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { performances: true, ratings: true } },
    },
  });

  const normalizedList = new Set(ADULT_PERFORMER_NAMES.map(normalizeName));

  const matched = allActors.filter((a) => normalizedList.has(normalizeName(a.name)));

  if (matched.length === 0) {
    console.log("No actors from the adult-performer list found in the database.");
    return;
  }

  const totalPerf = matched.reduce((s, a) => s + a._count.performances, 0);
  const totalRatings = matched.reduce((s, a) => s + a._count.ratings, 0);

  console.log(`Found ${matched.length} actor(s) to remove:`);
  matched.forEach((a, i) => {
    console.log(
      `  ${i + 1}. ${a.name} (${a.slug ?? a.id}) — ${a._count.performances} performances, ${a._count.ratings} ratings`
    );
  });
  console.log(`\nImpact: ${totalPerf} performances and ${totalRatings} ratings would be removed (cascade).`);

  if (!doDelete) {
    console.log("\nRun with --yes to delete these actors and cascade to performances/ratings.");
    return;
  }

  console.log("\nDeleting...");
  let deleted = 0;
  let errors = 0;
  for (const actor of matched) {
    try {
      await prisma.actor.delete({ where: { id: actor.id } });
      console.log(`  Deleted: ${actor.name}`);
      deleted++;
    } catch (e: unknown) {
      console.error(`  Error deleting ${actor.name}:`, e);
      errors++;
    }
  }
  console.log(`\nDone. Deleted: ${deleted} actors. Errors: ${errors}.`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
