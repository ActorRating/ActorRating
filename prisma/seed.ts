import { prisma } from '../src/lib/prisma';
import { searchMovie, getMovieCreditsForIngestion } from '../src/lib/tmdb';
import { SYSTEM_USER_ID, syncMovieCast } from '../src/lib/movie-ingestion';

const titles = ['Inception', 'Her', 'Whiplash'];

async function main() {
  console.log('Starting database seeding...');

  for (const movieTitle of titles) {
    try {
      console.log(`\nProcessing movie: ${movieTitle}`);

      const movieData = await searchMovie(movieTitle);
      if (!movieData) {
        console.log(`❌ Movie not found: ${movieTitle}`);
        continue;
      }
      console.log(`✅ Found movie: ${movieData.title} (${movieData.release_date})`);

      // Rate-limited full cast fetch
      const credits = await getMovieCreditsForIngestion(movieData.id);
      console.log(`✅ Director: ${credits.director}, cast: ${credits.cast.length}`);

      const year = new Date(movieData.release_date).getFullYear();
      let movie = await prisma.movie.findFirst({
        where: { title: movieData.title, year },
      });

      if (!movie) {
        movie = await prisma.movie.create({
          data: {
            title: movieData.title,
            year,
            director: credits.director,
            tmdbId: movieData.id,
            overview: movieData.overview,
          },
        });
        console.log(`🆕 Created movie: ${movie.title} (${movie.year})`);
      } else {
        if (movie.tmdbId === null) {
          movie = await prisma.movie.update({
            where: { id: movie.id },
            data: { tmdbId: movieData.id, director: credits.director },
          });
        }
        console.log(`⏭️  Using existing movie: ${movie.title} (${movie.year})`);
      }

      const { actorsCreated, performancesUpserted } = await syncMovieCast(
        prisma,
        movie.id,
        SYSTEM_USER_ID,
        credits,
        { director: credits.director }
      );
      console.log(`   Actors created: ${actorsCreated}, performances upserted: ${performancesUpserted}`);
    } catch (error) {
      console.error(`❌ Error processing movie ${movieTitle}:`, error);
    }
  }

  console.log('\n✅ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 