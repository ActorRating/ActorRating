#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

// Configuration
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const RATE_LIMIT_DELAY = 300; // 300ms between requests
const MAX_RETRIES = 3;
const ACTORS_PER_PAGE = 20;
const TOTAL_ACTORS_NEEDED = 300;

// Helper function to create URL-friendly slug
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

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

// Fetch actor details from TMDb
async function fetchActorDetails(actorId) {
  const url = `${TMDB_BASE_URL}/person/${actorId}?api_key=${process.env.TMDB_API_KEY}`;
  return await makeApiRequest(url);
}

// Fetch popular actors from TMDb
async function fetchPopularActors(page = 1) {
  const url = `${TMDB_BASE_URL}/person/popular?api_key=${process.env.TMDB_API_KEY}&page=${page}`;
  return await makeApiRequest(url);
}

async function fetchTopActors() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🎬 Fetching top 300 actors from TMDb...\n');
    
    // Check if TMDB_API_KEY is available
    if (!process.env.TMDB_API_KEY) {
      throw new Error('TMDB_API_KEY not found in environment variables');
    }
    
    const actors = [];
    let currentPage = 1;
    let totalPages = 1;
    
    // Fetch actors page by page until we have 300
    while (actors.length < TOTAL_ACTORS_NEEDED && currentPage <= totalPages) {
      console.log(`📄 Fetching page ${currentPage}...`);
      
      const response = await fetchPopularActors(currentPage);
      totalPages = response.total_pages;
      
      console.log(`   Found ${response.results.length} actors on page ${currentPage}`);
      
      // Process each actor on this page
      for (const actor of response.results) {
        if (actors.length >= TOTAL_ACTORS_NEEDED) break;
        
        try {
          console.log(`   🔍 Fetching details for: ${actor.name}`);
          
          // Fetch detailed information
          const details = await fetchActorDetails(actor.id);
          
          // Prepare actor data
          const actorData = {
            tmdbId: actor.id,
            name: actor.name,
            bio: details.biography || null,
            birthDate: details.birthday ? new Date(details.birthday) : null,
            nationality: details.place_of_birth || null,
            imageUrl: actor.profile_path ? `https://image.tmdb.org/t/p/w500${actor.profile_path}` : null
          };
          
          actors.push(actorData);
          console.log(`   ✅ Added: ${actor.name}`);
          
        } catch (error) {
          console.log(`   ❌ Failed to fetch details for ${actor.name}: ${error.message}`);
        }
        
        // Rate limiting delay
        await sleep(RATE_LIMIT_DELAY);
      }
      
      currentPage++;
      
      // Small delay between pages
      if (currentPage <= totalPages && actors.length < TOTAL_ACTORS_NEEDED) {
        await sleep(500);
      }
    }
    
    console.log(`\n💾 Inserting ${actors.length} actors into database...`);
    
    // Insert actors into database
    let insertedCount = 0;
    for (const actor of actors) {
      try {
        await prisma.actor.create({
          data: actor
        });
        insertedCount++;
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`   ⚠️  Actor ${actor.name} already exists, skipping...`);
        } else {
          console.log(`   ❌ Failed to insert ${actor.name}: ${error.message}`);
        }
      }
    }
    
    console.log(`\n✅ Actors added successfully: ${insertedCount}/${actors.length}`);
    
    // Verify final count
    const totalActors = await prisma.actor.count();
    console.log(`📊 Total actors in database: ${totalActors}`);
    
    return insertedCount;
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fetchTopActors()
  .then(count => {
    console.log(`\n🎉 Script completed successfully!`);
    console.log(`✅ Actors added successfully: ${count}/300`);
  })
  .catch(error => {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  });
