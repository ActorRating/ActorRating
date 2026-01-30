/**
 * Remove Category 1: Explicit Adult Content from the database.
 * - Movies with "sex", "voyeur", "massage", "adult", or "erotic" in title (or genre/overview)
 * Deleting a Movie cascades to Performance and Rating, so those rate pages disappear from sitemaps.
 *
 * Usage:
 *   npx ts-node scripts/remove-adult-content.ts         # dry run (report only)
 *   npx ts-node scripts/remove-adult-content.ts --yes  # actually delete
 */

import { prisma } from "../src/lib/prisma";
import { isAdultContentMovie } from "../src/lib/adult-content-filter";

async function main() {
  const doDelete = process.argv.includes("--yes");
  console.log("Category 1: Explicit Adult Content removal");
  console.log(doDelete ? "Mode: DELETE (--yes)" : "Mode: DRY RUN (use --yes to delete)\n");

  // Load all movies with genre and overview for filter
  const allMovies = await prisma.movie.findMany({
    select: {
      id: true,
      title: true,
      year: true,
      genre: true,
      overview: true,
      _count: {
        select: { performances: true, ratings: true },
      },
    },
  });

  const adultMovies = allMovies.filter((m) =>
    isAdultContentMovie({
      title: m.title,
      genre: m.genre ?? undefined,
      overview: m.overview ?? undefined,
    })
  );

  if (adultMovies.length === 0) {
    console.log("No movies matching adult keywords (sex, voyeur, massage, adult, erotic) found.");
    return;
  }

  const totalPerformances = adultMovies.reduce((s, m) => s + m._count.performances, 0);
  const totalRatings = adultMovies.reduce((s, m) => s + m._count.ratings, 0);

  console.log(`Found ${adultMovies.length} movie(s) matching adult content criteria:`);
  adultMovies.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.title} (${m.year}) — ${m._count.performances} performances, ${m._count.ratings} ratings`);
  });
  console.log(`\nImpact: ${totalPerformances} performances and ${totalRatings} ratings would be removed (cascade).`);

  if (!doDelete) {
    console.log("\nRun with --yes to delete these movies and cascade to performances/ratings.");
    return;
  }

  console.log("\nDeleting...");
  let deleted = 0;
  let errors = 0;
  for (const movie of adultMovies) {
    try {
      await prisma.movie.delete({ where: { id: movie.id } });
      console.log(`  Deleted: ${movie.title} (${movie.year})`);
      deleted++;
    } catch (e: unknown) {
      console.error(`  Error deleting ${movie.title}:`, e);
      errors++;
    }
  }
  console.log(`\nDone. Deleted: ${deleted} movies. Errors: ${errors}.`);
  console.log(`Performances/ratings removed by cascade: ${totalPerformances} / ${totalRatings}.`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
