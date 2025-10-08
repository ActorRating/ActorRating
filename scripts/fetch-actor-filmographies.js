#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

// Configuration
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const RATE_LIMIT_DELAY = 250; // 250ms between requests (40 requests per 10 seconds)
const MAX_RETRIES = 3;
const BATCH_SIZE = 10; // Process actors in batches for better progress tracking

// Helper function to sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to make API request with retry logic
async function makeApiRequest(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limited - wait longer before retry
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`   ⏳ Rate limited, waiting ${waitTime}ms before retry ${attempt}/${retries}`);
        await sleep(waitTime);
        continue;
      }
      
      if (attempt === retries) {
        throw error;
      }
      
      console.log(`   ⚠️  Request failed (attempt ${attempt}/${retries}), retrying...`);
      await sleep(1000);
    }
  }
}

// Fetch actor's movie credits from TMDb
async function fetchActorCredits(actorId) {
  const url = `${TMDB_BASE_URL}/person/${actorId}/movie_credits?api_key=${process.env.TMDB_API_KEY}`;
  return await makeApiRequest(url);
}

// Create or find movie in database
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

// Process a single actor's filmography
async function processActorFilmography(prisma, actor, actorIndex, totalActors) {
  try {
    console.log(`🎬 Fetching filmography for Actor #${actorIndex + 1}/${totalActors}: ${actor.name}...`);
    
    // Fetch actor's movie credits
    const credits = await fetchActorCredits(actor.tmdbId);
    
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

  } catch (error) {
    console.log(`   ❌ Failed to fetch filmography for ${actor.name}: ${error.message}`);
    return 0;
  }
}

async function fetchActorFilmographies() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🎬 Fetching actor filmographies from TMDb...\n');
    
    // Check if TMDB_API_KEY is available
    if (!process.env.TMDB_API_KEY) {
      throw new Error('TMDB_API_KEY not found in environment variables');
    }
    
    // Get all actors from database
    const actors = await prisma.actor.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log(`📊 Found ${actors.length} actors to process\n`);
    
    let totalPerformances = 0;
    let processedActors = 0;
    
    // Process actors in batches
    for (let i = 0; i < actors.length; i += BATCH_SIZE) {
      const batch = actors.slice(i, i + BATCH_SIZE);
      
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(actors.length / BATCH_SIZE)} (${batch.length} actors)`);
      
      // Process each actor in the batch
      for (const actor of batch) {
        const performancesAdded = await processActorFilmography(prisma, actor, i + batch.indexOf(actor), actors.length);
        totalPerformances += performancesAdded;
        processedActors++;
        
        // Rate limiting delay
        await sleep(RATE_LIMIT_DELAY);
      }
      
      // Longer delay between batches
      if (i + BATCH_SIZE < actors.length) {
        console.log(`   ⏳ Batch complete, waiting 2 seconds before next batch...`);
        await sleep(2000);
      }
    }
    
    console.log(`\n🎉 Filmography fetch completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Actors processed: ${processedActors}/${actors.length}`);
    console.log(`   - Total performances added: ${totalPerformances}`);
    
    // Verify final counts
    const finalActorCount = await prisma.actor.count();
    const finalMovieCount = await prisma.movie.count();
    const finalPerformanceCount = await prisma.performance.count();
    
    console.log(`\n📈 Database totals:`);
    console.log(`   - Actors: ${finalActorCount}`);
    console.log(`   - Movies: ${finalMovieCount}`);
    console.log(`   - Performances: ${finalPerformanceCount}`);
    
    return totalPerformances;
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fetchActorFilmographies()
  .then(performances => {
    console.log(`\n✅ Script completed successfully!`);
    console.log(`✅ Performances added successfully: ${performances}`);
  })
  .catch(error => {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  });
