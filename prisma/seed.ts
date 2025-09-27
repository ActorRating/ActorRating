import { prisma } from '../src/lib/prisma';
import { searchMovie, getMovieCredits } from '../src/lib/tmdb';

// Sleep helper function
function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

// Hardcoded array of movie titles
const titles = ["Inception", "Her", "Whiplash"];

async function main() {
  console.log('Starting database seeding...');

  for (const movieTitle of titles) {
    try {
      console.log(`\nProcessing movie: ${movieTitle}`);

      // 1. Call searchMovie(title) to get id, title, and releaseDate
      const movieData = await searchMovie(movieTitle);
      if (!movieData) {
        console.log(`❌ Movie not found: ${movieTitle}`);
        continue;
      }

      console.log(`✅ Found movie: ${movieData.title} (${movieData.release_date})`);

      // 2. Call getMovieCredits(id) to get director and cast
      const credits = await getMovieCredits(movieData.id);
      console.log(`✅ Found director: ${credits.director}`);
      console.log(`✅ Found ${credits.cast.length} cast members`);

      // Extract year from release date
      const year = new Date(movieData.release_date).getFullYear();

      // 4. Check for existing movie before creating
      const existingMovie = await prisma.movie.findFirst({
        where: {
          title: movieData.title,
          year: year,
        },
      });

      let movie;
      if (!existingMovie) {
        movie = await prisma.movie.create({
          data: {
            title: movieData.title,
            year: year,
            director: credits.director,
            tmdbId: movieData.id,
            overview: movieData.overview
          }
        });
        console.log(`🆕 Created new movie: ${movie.title} (${movie.year})`);
      } else {
        movie = existingMovie;
        console.log(`⏭️  Found existing movie: ${movie.title} (${movie.year})`);
      }

      // 5. For each actor in cast:
      for (const castMember of credits.cast) {
        // Check for existing actor before creating
        const existingActor = await prisma.actor.findFirst({
          where: {
            name: castMember.name
          }
        });

        let actor;
        if (!existingActor) {
          actor = await prisma.actor.create({
            data: {
              name: castMember.name
            }
          });
          console.log(`🆕 Created new actor: ${actor.name}`);
        } else {
          actor = existingActor;
          console.log(`⏭️  Found existing actor: ${actor.name}`);
        }

        // Create Performance only if it doesn't exist (by userId + actorId + movieId)
        // Note: We need a userId for the Performance model
        // NEW (Supabase-managed user id hardcoded from auth.users table)
        const DEFAULT_USER_ID = "uuid-from-auth-users"; // grab one from Supabase
        let defaultUserId = DEFAULT_USER_ID;

        const existingPerformance = await prisma.performance.findUnique({
          where: {
            userId_actorId_movieId: {
              userId: defaultUserId,
              actorId: actor.id,
              movieId: movie.id
            }
          }
        });

        if (!existingPerformance) {
          // Create performance if it doesn't exist
          const performance = await prisma.performance.create({
            data: {
              userId: defaultUserId,
              actorId: actor.id,
              movieId: movie.id,
              emotionalRangeDepth: 0,
              characterBelievability: 0,
              technicalSkill: 0,
              screenPresence: 0,
              chemistryInteraction: 0,
              comment: `Character: ${castMember.character}, Director: ${credits.director}`
            }
          });
          console.log(`🆕 Created new performance: ${actor.name} as ${castMember.character} in ${movie.title}`);
        } else {
          console.log(`⏭️  Skipped existing performance: ${actor.name} in ${movie.title}`);
        }
      }

      // Add sleep after each movie to avoid rate limits
      console.log(`⏳ Waiting 300ms before next movie...`);
      await sleep(300);

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