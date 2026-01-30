/**
 * List movies with "subtle" adult content keywords for manual review.
 * Keywords: seduc, tempt, affair, obsess, desire, forbidden, passion, mistress
 * Do NOT auto-delete — review top 50 and delete only if not mainstream.
 *
 * Usage: npx tsx scripts/list-subtle-adult-movies.ts
 */

import { prisma } from "../src/lib/prisma";
import { hasSubtleAdultKeyword } from "../src/lib/adult-content-filter";

async function main() {
  console.log("Subtle adult content keywords: seduc, tempt, affair, obsess, desire, forbidden, passion, mistress\n");
  console.log("Listing movies for MANUAL REVIEW (do not auto-delete):\n");

  const allMovies = await prisma.movie.findMany({
    select: {
      id: true,
      title: true,
      year: true,
      genre: true,
      _count: { select: { performances: true, ratings: true } },
    },
    orderBy: { title: "asc" },
  });

  const matches = allMovies.filter((m) => hasSubtleAdultKeyword(m.title));

  if (matches.length === 0) {
    console.log("No movies matching subtle keywords found.");
    return;
  }

  // Sort by performance count descending (like the SQL ORDER BY perf_count DESC)
  const byCount = [...matches].sort(
    (a, b) => b._count.performances - a._count.performances
  );

  console.log(`Found ${matches.length} movie(s). Top 50 by performance count:\n`);
  byCount.slice(0, 50).forEach((m, i) => {
    console.log(
      `  ${i + 1}. ${m.title} (${m.year}) — ${m._count.performances} perf, ${m._count.ratings} ratings ${m.genre ? `[${m.genre}]` : ""}`
    );
  });
  if (matches.length > 50) {
    console.log(`\n  ... and ${matches.length - 50} more. Run with DB access to see all.`);
  }
  console.log("\nAction: Manually review; delete if not mainstream.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
