import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import axios from 'axios';

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const RATE_LIMIT_DELAY = 250; // 250ms delay between requests
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, params = {}, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'en-US',
          ...params,
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

async function main() {
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY is not set in your .env.local file.');
    process.exit(1);
  }

  const newActors = [
    // Modern Stars (14)
    "Ryan Reynolds", "Adam Driver", "Andrew Garfield", "John Boyega", "Oscar Isaac", 
    "Michael B. Jordan", "Paul Rudd", "Sebastian Stan", "Chris Pine", "Mahershala Ali", 
    "Rami Malek", "Casey Affleck", "Dev Patel", "Shia LaBeouf",
    
    // Leading Actresses (12)
    "Jennifer Lawrence", "Brie Larson", "Saoirse Ronan", "Natalie Portman", "Cate Blanchett", 
    "Frances McDormand", "Meryl Streep", "Emma Stone", "Reese Witherspoon", "Viola Davis", 
    "Taraji P. Henson", "Keira Knightley",
    
    // Classic Hollywood Legends (18)
    "Humphrey Bogart", "James Stewart", "Cary Grant", "Gregory Peck", "Spencer Tracy", 
    "Kirk Douglas", "Burt Lancaster", "James Dean", "Clark Gable", "Gary Cooper", 
    "Paul Muni", "William Holden", "Fred Astaire", "Gene Kelly", "Laurence Olivier", 
    "John Wayne", "Sidney Poitier", "Steve McQueen",
    
    // Character Actors (12)
    "Michael Shannon", "Richard Jenkins", "J.K. Simmons", "Stanley Tucci", "Mark Strong", 
    "Giancarlo Esposito", "Bryan Cranston", "Aaron Paul", "Ethan Suplee", "John Goodman", 
    "Brendan Gleeson", "Chiwetel Ejiofor",
    
    // Action Stars (4)
    "Mads Mikkelsen", "Dave Bautista", "John Cena", "Terry Crews",
    
    // Additional (1)
    "Charles Bronson", "James Coburn"
  ];

  console.log('🎬 Adding 62 legendary actors to the database...');
  console.log(`📊 Processing ${newActors.length} actors\n`);

  let addedCount = 0;
  let existedCount = 0;
  let failedCount = 0;

  for (const actorName of newActors) {
    console.log(`🔍 Processing ${newActors.indexOf(actorName) + 1}/${newActors.length}: ${actorName}`);

    try {
      // Check if actor already exists by name
      const existingActor = await prisma.actor.findUnique({
        where: { name: actorName },
      });

      if (existingActor) {
        console.log(`   ℹ️  Actor "${actorName}" already exists. Skipping.`);
        existedCount++;
        await delay(RATE_LIMIT_DELAY);
        continue;
      }

      // Search TMDb for the actor
      const searchResults = await fetchWithRetry(`${TMDB_BASE_URL}/search/person`, { query: actorName });
      const tmdbActor = searchResults.results.find(r => r.name === actorName);

      if (!tmdbActor) {
        console.log(`   ❌ Actor "${actorName}" not found on TMDb. Skipping.`);
        failedCount++;
        await delay(RATE_LIMIT_DELAY);
        continue;
      }

      // Fetch full details for the actor
      const details = await fetchWithRetry(`${TMDB_BASE_URL}/person/${tmdbActor.id}`);

      if (!details) {
        console.log(`   ❌ Failed to fetch details for "${actorName}". Skipping.`);
        failedCount++;
        await delay(RATE_LIMIT_DELAY);
        continue;
      }

      // Create actor in database
      const actorData = {
        tmdbId: details.id,
        name: details.name,
        bio: details.biography || null,
        birthDate: details.birthday ? new Date(details.birthday) : null,
        nationality: details.place_of_birth || null,
        imageUrl: details.profile_path ? `https://image.tmdb.org/t/p/w500${details.profile_path}` : null,
      };

      await prisma.actor.create({
        data: actorData,
      });

      console.log(`   ✅ Added: ${details.name} (TMDb ID: ${details.id})`);
      addedCount++;

    } catch (error) {
      console.error(`   ❌ Failed to process ${actorName}:`, error);
      failedCount++;
    }
    await delay(RATE_LIMIT_DELAY); // Respect TMDb rate limit
  }

  console.log('\n🎉 Additional legendary actors processing completed!');
  console.log('📊 Summary:');
  console.log(`   - Actors processed: ${newActors.length}`);
  console.log(`   - Successfully added: ${addedCount}`);
  console.log(`   - Already existed: ${existedCount}`);
  console.log(`   - Failed to add: ${failedCount}`);

  const finalActorCount = await prisma.actor.count();
  console.log(`\n📈 Total actors in database: ${finalActorCount}`);

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
