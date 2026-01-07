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

// Protected films that must never be auto-deleted
const PROTECTED_FILMS = new Set([
  'East of Eden (1955)',
  'East of Eden',
  'The Onion Movie (2008)',
  'The Onion Movie',
  'Miracle Apples (2013)',
  'Miracle Apples',
]);

function isProtectedFilm(title, year) {
  const titleWithYear = year ? `${title} (${year})` : title;
  return PROTECTED_FILMS.has(title) || PROTECTED_FILMS.has(titleWithYear);
}

// Check if a movie is a joke performance that should be excluded
function isJokePerformance(title, overview, year, director) {
  if (!title) return false;

  // Check allowlist - protected films are NEVER deleted
  if (isProtectedFilm(title, year)) {
    return false;
  }

  // Protect older films (pre-2010) - they're likely legitimate classics
  const isOlderFilm = year && year < 2010;
  const hasDirector = director && director.trim() !== '' && director.toLowerCase() !== 'unknown';

  const titleLower = title.toLowerCase().trim();
  const overviewLower = (overview || '').toLowerCase().trim();
  const searchText = `${titleLower} ${overviewLower}`;

  // Safe-to-delete patterns (high confidence, always exclude)
  const safeToDeletePatterns = [
    /\btiktok\s+saga\b/i,
    /\btik\s*tok\s+saga\b/i,
    /\bdirector'?s\s+cut.*tiktok\b/i,
    /\btiktok.*director'?s\s+cut\b/i,
    /\b(dvd|blu.?ray)\s+(compilation|collection|set)\b/i,
    /\bcompilation\s+(dvd|blu.?ray|collection)\b/i,
    /\bvolume\s+\d+\s+(compilation|collection)\b/i,
    /\bbloopers?\s+(uncensored|compilation|collection|dvd)\b/i,
    /\b(uncensored|compilation).*bloopers?\b/i,
    /\bbest\s+of\s+(.*?)\s+(compilation|collection|dvd)\b/i,
    /\bcompilation.*best\s+of\b/i,
    /\b(clip|clips)\s+compilation\b/i,
    /\bcompilation\s+of\s+clips\b/i,
    /\btrailer\s+compilation\b/i,
    /\bcompilation\s+of\s+trailers\b/i,
    /\bmeme\s+(video|compilation)\b/i,
    /\bcompilation.*meme\b/i,
    /\bfan\s+(edit|made|video)\b/i,
    /\binstagram\s+(story|reel|video|short)\b/i,
    /\bsnapchat\s+(story|video|short)\b/i,
    /\btwitter\s+(video|thread)\b/i,
    /\bx\s+(video|thread)\b/i,
    /\byoutube\s+(skit|short|series)\b/i,
    /\byoutube\s+original\s+(skit|short)\b/i,
    /\bweb\s+short\b/i,
    /\bdigital\s+short\b/i,
    /\bonline\s+short\b/i,
    /\breaction\s+(video|to)\b/i,
    /\bcompilation\s+of\s+(tiktok|youtube|videos)\b/i,
    /\bbehind\s+the\s+scenes\s+(of\s+)?(tiktok|youtube|social\s+media)\b/i,
    /\b(tiktok|youtube)\s+(as\s+a\s+)?movie\b/i,
    /\b(tiktok|youtube)\s+cinematic\b/i,
  ];

  // Check safe-to-delete patterns first
  for (const pattern of safeToDeletePatterns) {
    if (pattern.test(searchText)) {
      // Even safe patterns don't delete older films with directors
      if (isOlderFilm && hasDirector) {
        continue;
      }
      return true;
    }
  }

  // Review-needed patterns (only delete if not protected)
  const reviewNeededPatterns = [
    /\bparody\s+(only|video|skit)\b/i,
  ];

  for (const pattern of reviewNeededPatterns) {
    if (pattern.test(searchText)) {
      // Protect older films and films with directors
      if (isOlderFilm && hasDirector) {
        continue;
      }
      
      // Only flag if it's clearly a video/skit compilation, not a standalone film
      const isVideoSkit = /\b(video|skit|compilation)\b/i.test(searchText);
      const isStandaloneFilm = hasDirector && !isVideoSkit;
      
      if (isStandaloneFilm) {
        continue;
      }
      
      return true;
    }
  }

  // Suspicious title patterns
  const suspiciousTitlePatterns = [
    /^tiktok\s*$/i,
    /^youtube\s*$/i,
    /^instagram\s*$/i,
    /^snapchat\s*$/i,
    /^meme\s*$/i,
  ];

  for (const pattern of suspiciousTitlePatterns) {
    if (pattern.test(titleLower)) {
      // Protect older films even with suspicious titles
      if (isOlderFilm && hasDirector) {
        continue;
      }
      return true;
    }
  }

  return false;
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
