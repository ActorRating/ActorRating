#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const RATE_LIMIT_DELAY = 300; // 300ms delay between requests
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

// List of additional actors to add (cleaned up and deduplicated)
const additionalActors = [
  // Classic Legends
  "Daniel Day-Lewis", "Jack Nicholson", "Anthony Hopkins", "Robert Duvall", 
  "Gene Hackman", "Sean Penn", "Philip Seymour Hoffman", "Jeff Bridges", 
  "Al Pacino", "Paul Newman", "Peter O'Toole", "John Malkovich",
  "Kevin Spacey", "Christopher Walken", "Ben Kingsley", "Dustin Hoffman",
  "Dennis Hopper", "Jon Voight", "Ralph Fiennes", "James Cromwell",
  "Albert Finney", "Geoffrey Rush", "Ed Harris", "Joaquin Phoenix",
  "Djimon Hounsou", "Tim Robbins", "Tom Wilkinson", "William Hurt",
  "Robin Williams", "Robert Redford", "Tommy Lee Jones", "Forest Whitaker",
  "Paul Giamatti", "Michael Douglas", "Brian Dennehy", "Nick Nolte",
  "Sean Connery", "George Clooney", "Gary Sinise", "Colin Firth",
  "Viggo Mortensen", "Billy Bob Thornton", "Mickey Rourke", "Don Cheadle",
  "Christoph Waltz", "Will Smith", "Alec Baldwin", "Ian McKellen",
  "Sam Rockwell", "Barry Pepper", "Orlando Bloom", "John Travolta",
  "John Hawkes", "David Strathairn", "Bill Murray", "Heath Ledger",
  "Clive Owen", "Tom Sizemore", "Christopher Lee", "Jean Reno",
  "Adrien Brody", "Daniel Craig", "William H. Macy", "Alan Arkin",
  "Tim Roth", "Javier Bardem", "James Caan", "Chris Cooper", "Josh Hartnett",
  
  // Modern Stars
  "Adam Sandler", "Will Ferrell", "Seth Rogen", "Zac Efron", 
  "Jonah Hill", "Ice Cube", "Chris Hemsworth", "Tom Hiddleston",
  "Karl Urban", "Marlon Brando", "Arnold Schwarzenegger", "Jet Li",
  "Dolph Lundgren", "Chris Evans", "Jeremy Renner", "Steven Seagal",
  "Gal Gadot", "Jesse Eisenberg", "Steve Carell", "Chris Tucker",
  "Aaron Eckhart", "Liv Tyler", "Elijah Wood", "Terrence Howard",
  "William Fichtner", "Owen Wilson", "Vince Vaughn", "Rob Schneider",
  "Chris Pratt", "John C. Reilly", "Julia Roberts", "Jennifer Aniston",
  "Lupita Nyong'o", "Ben Stiller", "Eddie Murphy", "Eddie Redmayne",
  "Danny DeVito", "Danny Glover", "Tobey Maguire", "James Franco",
  "Joe Manganiello", "Anna Faris", "Joey Morgan", "Kurt Russell",
  "Benedict Cumberbatch", "Russell Crowe", "Jamie Foxx", "Charlie Day"
];

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

async function searchActorByName(name) {
  try {
    const searchUrl = `${TMDB_BASE_URL}/search/person`;
    const searchResults = await fetchWithRetry(searchUrl + `?query=${encodeURIComponent(name)}`);
    
    if (searchResults.results && searchResults.results.length > 0) {
      // Find the best match (usually the first result with highest popularity)
      const bestMatch = searchResults.results
        .filter(person => person.known_for_department === 'Acting')
        .sort((a, b) => b.popularity - a.popularity)[0];
      
      if (bestMatch) {
        return bestMatch;
      }
    }
    return null;
  } catch (error) {
    console.error(`   ❌ Failed to search for ${name}:`, error.message);
    return null;
  }
}

async function fetchActorDetails(tmdbId) {
  try {
    const detailsUrl = `${TMDB_BASE_URL}/person/${tmdbId}`;
    const details = await fetchWithRetry(detailsUrl);
    return details;
  } catch (error) {
    console.error(`   ❌ Failed to fetch details for actor ${tmdbId}:`, error.message);
    return null;
  }
}

async function main() {
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY is not set in your .env.local file.');
    process.exit(1);
  }

  console.log('🎬 Adding additional legendary actors to the database...');
  console.log(`📊 Processing ${additionalActors.length} actors\n`);

  let addedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < additionalActors.length; i++) {
    const actorName = additionalActors[i];
    console.log(`🔍 Processing ${i + 1}/${additionalActors.length}: ${actorName}`);

    try {
      // Check if actor already exists
      const existingActor = await prisma.actor.findFirst({
        where: {
          name: {
            equals: actorName,
            mode: 'insensitive'
          }
        }
      });

      if (existingActor) {
        console.log(`   ℹ️  Already exists: ${actorName}`);
        skippedCount++;
        continue;
      }

      // Search for actor on TMDb
      const searchResult = await searchActorByName(actorName);
      if (!searchResult) {
        console.log(`   ❌ Not found on TMDb: ${actorName}`);
        failedCount++;
        await delay(RATE_LIMIT_DELAY);
        continue;
      }

      // Fetch detailed information
      const details = await fetchActorDetails(searchResult.id);
      if (!details) {
        console.log(`   ❌ Failed to fetch details: ${actorName}`);
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
      console.error(`   ❌ Failed to process ${actorName}:`, error.message);
      failedCount++;
    }

    await delay(RATE_LIMIT_DELAY);
  }

  console.log('\n🎉 Additional actors processing completed!');
  console.log('📊 Summary:');
  console.log(`   - Actors processed: ${additionalActors.length}`);
  console.log(`   - Successfully added: ${addedCount}`);
  console.log(`   - Already existed: ${skippedCount}`);
  console.log(`   - Failed to add: ${failedCount}`);

  const totalActors = await prisma.actor.count();
  console.log(`\n📈 Total actors in database: ${totalActors}`);
}

main()
  .catch(e => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
