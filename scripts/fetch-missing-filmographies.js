import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import axios from 'axios';
import { isJokePerformance } from '../src/lib/joke-performance-filter';

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const RATE_LIMIT_DELAY = 250; // 250ms delay between requests (40 requests per 10 seconds)
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000; // Initial retry delay

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'en-US',
        },
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || (RETRY_DELAY_MS * (i + 1)) / 1000;
        console.warn(`   ⚠️ Rate limit hit. Retrying after ${retryAfter} seconds...`);
        await delay(retryAfter * 1000);
      } else {
        console.error(`   ❌ API call failed (attempt ${i + 1}/${retries}):`, error.message);
        if (i < retries - 1) {
          await delay(RETRY_DELAY_MS * (i + 1));
        }
      }
    }
  }
  throw new Error(`Failed to fetch data from ${url} after ${retries} retries.`);
}

async function findOrCreateMovie(prisma, movieData) {
  try {
    // Try to find existing movie by tmdbId
    let movie = await prisma.movie.findUnique({
      where: { tmdbId: movieData.id }
    });

    if (!movie) {
      // Create new movie
      movie = await prisma.movie.create({
        data: {
          tmdbId: movieData.id,
          title: movieData.title,
          year: movieData.release_date ? new Date(movieData.release_date).getFullYear() : null,
          director: null, // We don't have director info from credits
          genre: null, // We don't have genre info from credits
          overview: movieData.overview || null
        }
      });
    }

    return movie;
  } catch (error) {
    console.log(`   ❌ Failed to create/find movie "${movieData.title}": ${error.message}`);
    return null;
  }
}

async function processActorFilmography(prisma, actor, actorIndex, totalActors) {
  try {
    console.log(`🎬 Fetching filmography for Actor #${actorIndex + 1}/${totalActors}: ${actor.name}...`);
    
    // Fetch actor's movie credits
    const credits = await fetchWithRetry(`${TMDB_BASE_URL}/person/${actor.tmdbId}/movie_credits`);
    
    if (!credits.cast || credits.cast.length === 0) {
      console.log(`   ℹ️  No movie credits found for ${actor.name}`);
      return 0;
    }

    let performancesAdded = 0;
    
    // Process each movie credit
    for (const credit of credits.cast) {
      try {
        // Skip if no release date (unreleased movies)
        if (!credit.release_date) {
          continue;
        }

        // Skip joke performances (TikTok, YouTube skits, memes, etc.)
        const creditYear = credit.release_date ? new Date(credit.release_date).getFullYear() : null;
        if (isJokePerformance(credit.title, credit.overview, creditYear, null)) {
          console.log(`   ⏭️  Skipping joke performance: "${credit.title}"`);
          continue;
        }

        // Find or create movie
        const movie = await findOrCreateMovie(prisma, credit);
        if (!movie) {
          continue;
        }

        // Check if performance already exists
        const existingPerformance = await prisma.performance.findFirst({
          where: {
            actorId: actor.id,
            movieId: movie.id
          }
        });

        if (existingPerformance) {
          // Skip duplicate
          continue;
        }

        // Create performance record
        await prisma.performance.create({
          data: {
            userId: 'system', // Placeholder user ID for system-imported data
            actorId: actor.id,
            movieId: movie.id,
            character: credit.character || null,
            // Set default performance scores (these can be updated later by users)
            emotionalRangeDepth: 0,
            characterBelievability: 0,
            technicalSkill: 0,
            screenPresence: 0,
            chemistryInteraction: 0
          }
        });

        performancesAdded++;
        
      } catch (error) {
        console.log(`   ⚠️  Failed to process movie "${credit.title}": ${error.message}`);
      }
    }

    console.log(`   ✅ Added ${performancesAdded} performances for ${actor.name}`);
    return performancesAdded;
  } catch (apiError) {
    console.error(`   ❌ Failed to fetch filmography for ${actor.name}:`, apiError.message);
    return 0;
  }
}

async function main() {
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY is not set in your .env.local file.');
    process.exit(1);
  }

  console.log('🎬 Fetching filmographies for actors with 0 performances...');

  // Get actors with no performances
  const actorsWithoutPerformances = await prisma.actor.findMany({
    where: {
      performances: {
        none: {}
      }
    },
    select: { id: true, tmdbId: true, name: true },
    orderBy: { name: 'asc' }
  });

  console.log(`\n📊 Found ${actorsWithoutPerformances.length} actors without performances\n`);

  let totalPerformancesAdded = 0;
  const BATCH_SIZE = 10; // Process actors in batches to manage logs and delays
  const BATCH_DELAY_MS = 2000; // Delay between batches

  for (let i = 0; i < actorsWithoutPerformances.length; i += BATCH_SIZE) {
    const batch = actorsWithoutPerformances.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(actorsWithoutPerformances.length / BATCH_SIZE)} (${batch.length} actors)`);

    for (const actor of batch) {
      const performancesAddedForActor = await processActorFilmography(prisma, actor, actorsWithoutPerformances.indexOf(actor), actorsWithoutPerformances.length);
      totalPerformancesAdded += performancesAddedForActor;
      await delay(RATE_LIMIT_DELAY); // Respect TMDb rate limit
    }
    if (i + BATCH_SIZE < actorsWithoutPerformances.length) {
      console.log(`   ⏳ Batch complete, waiting ${BATCH_DELAY_MS / 1000} seconds before next batch...`);
      await delay(BATCH_DELAY_MS);
    }
  }

  console.log('\n🎉 Missing filmographies fetch completed!');
  console.log('📊 Summary:');
  console.log(`   - Actors processed: ${actorsWithoutPerformances.length}`);
  console.log(`   - Total performances added: ${totalPerformancesAdded}`);

  const finalActorCount = await prisma.actor.count();
  const finalMovieCount = await prisma.movie.count();
  const finalPerformanceCount = await prisma.performance.count();

  console.log('\n📈 Database totals:');
  console.log(`   - Actors: ${finalActorCount}`);
  console.log(`   - Movies: ${finalMovieCount}`);
  console.log(`   - Performances: ${finalPerformanceCount}`);

  // Check how many actors still have 0 performances
  const stillMissingCount = await prisma.actor.count({
    where: {
      performances: {
        none: {}
      }
    }
  });

  console.log(`\n🎯 Actors still without performances: ${stillMissingCount}`);

  console.log('\n✅ Script completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
