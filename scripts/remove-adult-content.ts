/**
 * Remove junk and adult content from the database.
 * Deletes movies that match any of:
 * - Junk slug blocklist (JUNK_MOVIE_SLUGS)
 * - Slug-based adult detection (e.g. step-mom, penetrated, dirty-wife)
 * - Title/genre adult keywords (sex, voyeur, massage, erotic, porn, etc.)
 * Deleting a Movie cascades to Performance and Rating.
 *
 * Usage:
 *   npx ts-node scripts/remove-adult-content.ts         # dry run (report only)
 *   npx ts-node scripts/remove-adult-content.ts --yes  # actually delete
 */

import { prisma } from "../src/lib/prisma";
import { isAdultContentMovie, isAdultContentSlug } from "../src/lib/adult-content-filter";
import { isJunkMovieSlug } from "../src/lib/junk-movie-slugs";

/** Slugs to never delete (legitimate films that match keyword filters). */
const EXCLUDE_SLUGS = new Set(["the-naked-gun-2025"]);

function shouldRemove(
  slug: string | null,
  title: string,
  genre: string | null,
  overview: string | null
): boolean {
  const slugOrId = slug ?? "";
  if (isJunkMovieSlug(slugOrId)) return true;
  if (isAdultContentSlug(slugOrId)) return true;
  if (isAdultContentMovie({ title, genre: genre ?? undefined, overview: overview ?? undefined })) return true;
  return false;
}

async function main() {
  const doDelete = process.argv.includes("--yes");
  console.log("Junk & Adult Content removal (blocklist + slug + title/genre)");
  console.log(doDelete ? "Mode: DELETE (--yes)" : "Mode: DRY RUN (use --yes to delete)\n");

  const allMovies = await prisma.movie.findMany({
    select: {
      id: true,
      title: true,
      year: true,
      slug: true,
      genre: true,
      overview: true,
      _count: {
        select: { performances: true, ratings: true },
      },
    },
  });

  const toRemove = allMovies.filter((m) =>
    shouldRemove(m.slug ?? null, m.title, m.genre ?? null, m.overview ?? null)
  );
  const adultMovies = toRemove.filter((m) => !EXCLUDE_SLUGS.has((m.slug ?? "").toLowerCase()));

  if (adultMovies.length === 0) {
    console.log("No movies matching junk/adult criteria found.");
    return;
  }

  const totalPerformances = adultMovies.reduce((s, m) => s + m._count.performances, 0);
  const totalRatings = adultMovies.reduce((s, m) => s + m._count.ratings, 0);

  console.log(`Found ${adultMovies.length} movie(s) matching junk/adult criteria:`);
  adultMovies.forEach((m, i) => {
    const slugPart = m.slug ? ` [${m.slug}]` : "";
    console.log(`  ${i + 1}. ${m.title} (${m.year})${slugPart} — ${m._count.performances} performances, ${m._count.ratings} ratings`);
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
