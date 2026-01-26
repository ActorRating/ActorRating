import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🔍 Finding movies with future release years...\n");
  
  const currentYear = new Date().getFullYear();
  console.log(`Current year: ${currentYear}\n`);
  
  // Find all movies with years greater than current year
  const futureMovies = await prisma.movie.findMany({
    where: {
      year: {
        gt: currentYear
      }
    },
    orderBy: {
      year: 'desc'
    },
    select: {
      id: true,
      title: true,
      year: true,
      director: true,
      slug: true,
      tmdbId: true,
      createdAt: true,
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
  
  console.log(`⚠️  Found ${futureMovies.length} movie(s) with future years:\n`);
  console.log("=" .repeat(100));
  console.log(
    "Title".padEnd(50) + 
    "Year".padEnd(8) + 
    "Director".padEnd(25) + 
    "Performances".padEnd(15) + 
    "Ratings".padEnd(10) + 
    "Created"
  );
  console.log("=".repeat(100));
  
  futureMovies.forEach((movie) => {
    const title = (movie.title || "N/A").substring(0, 48).padEnd(50);
    const year = String(movie.year).padEnd(8);
    const director = (movie.director || "N/A").substring(0, 23).padEnd(25);
    const performances = String(movie._count.performances).padEnd(15);
    const ratings = String(movie._count.ratings).padEnd(10);
    const createdAt = movie.createdAt ? new Date(movie.createdAt).toISOString().split('T')[0] : "N/A";
    
    console.log(`${title}${year}${director}${performances}${ratings}${createdAt}`);
  });
  
  console.log("=".repeat(100));
  console.log(`\n📊 Summary:`);
  console.log(`   Total movies with future years: ${futureMovies.length}`);
  console.log(`   Years range: ${Math.min(...futureMovies.map(m => m.year))} - ${Math.max(...futureMovies.map(m => m.year))}`);
  console.log(`   Total performances: ${futureMovies.reduce((sum, m) => sum + m._count.performances, 0)}`);
  console.log(`   Total ratings: ${futureMovies.reduce((sum, m) => sum + m._count.ratings, 0)}`);
  
  // Group by year
  const byYear = futureMovies.reduce((acc, movie) => {
    const year = movie.year;
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(movie);
    return acc;
  }, {} as Record<number, typeof futureMovies>);
  
  console.log(`\n📅 Breakdown by year:`);
  Object.keys(byYear)
    .sort((a, b) => parseInt(b) - parseInt(a))
    .forEach(year => {
      console.log(`   ${year}: ${byYear[parseInt(year)].length} movie(s)`);
    });
  
  // Export to JSON for reference
  const exportData = futureMovies.map(m => ({
    id: m.id,
    title: m.title,
    year: m.year,
    director: m.director,
    slug: m.slug,
    tmdbId: m.tmdbId,
    performancesCount: m._count.performances,
    ratingsCount: m._count.ratings,
    createdAt: m.createdAt
  }));
  
  const fs = require('fs');
  const path = require('path');
  const exportPath = path.join(process.cwd(), 'exports', 'future-movies.json');
  
  // Ensure exports directory exists
  const exportsDir = path.dirname(exportPath);
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }
  
  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  console.log(`\n💾 Exported full list to: ${exportPath}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
