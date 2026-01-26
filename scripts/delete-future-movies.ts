import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🗑️  Deleting movies with future release years...\n");
  
  const currentYear = new Date().getFullYear();
  console.log(`Current year: ${currentYear}\n`);
  
  // Find all movies with years greater than current year
  const futureMovies = await prisma.movie.findMany({
    where: {
      year: {
        gt: currentYear
      }
    },
    include: {
      _count: {
        select: {
          performances: true,
          ratings: true
        }
      }
    }
  });
  
  if (futureMovies.length === 0) {
    console.log("✅ No movies with future years found!");
    return;
  }
  
  console.log(`⚠️  Found ${futureMovies.length} movie(s) with future years to delete:\n`);
  
  // Show summary
  const totalPerformances = futureMovies.reduce((sum, m) => sum + m._count.performances, 0);
  const totalRatings = futureMovies.reduce((sum, m) => sum + m._count.ratings, 0);
  
  console.log(`📊 Impact:`);
  console.log(`   Movies to delete: ${futureMovies.length}`);
  console.log(`   Performances that will be deleted (cascade): ${totalPerformances}`);
  console.log(`   Ratings that will be deleted (cascade): ${totalRatings}`);
  console.log(`\n`);
  
  // List movies being deleted
  console.log("Movies to be deleted:");
  futureMovies.forEach((movie, index) => {
    console.log(`   ${index + 1}. ${movie.title} (${movie.year}) - ${movie._count.performances} performances, ${movie._count.ratings} ratings`);
  });
  
  console.log(`\n🗑️  Starting deletion...\n`);
  
  // Delete movies (performances and ratings will cascade)
  let deletedCount = 0;
  let errorCount = 0;
  
  for (const movie of futureMovies) {
    try {
      await prisma.movie.delete({
        where: {
          id: movie.id
        }
      });
      console.log(`   ✅ Deleted: ${movie.title} (${movie.year})`);
      deletedCount++;
    } catch (error: any) {
      console.error(`   ❌ Error deleting ${movie.title}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n✅ Deletion complete!`);
  console.log(`   Successfully deleted: ${deletedCount} movie(s)`);
  if (errorCount > 0) {
    console.log(`   Errors: ${errorCount} movie(s)`);
  }
  console.log(`   Total performances deleted (cascade): ${totalPerformances}`);
  console.log(`   Total ratings deleted (cascade): ${totalRatings}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
