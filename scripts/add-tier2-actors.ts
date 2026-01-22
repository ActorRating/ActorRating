import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Get batch number from command line args
const batchNumber = parseInt(process.argv[2] || '1');
const batchSize = 10;

// Sleep helper to avoid rate limits
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// TIER 2 Actors - ALL 47 actors
const ALL_TIER_2_ACTORS = [
  // Contemporary Critical Favorites
  "Olivia Colman",
  "Colin Farrell",
  "Brendan Fraser",
  "Carey Mulligan",
  "Rebecca Hall",
  "Andrew Scott",
  "Barry Keoghan",
  "Paul Mescal",
  "Jodie Comer",
  "Jessie Buckley",
  "Riz Ahmed",
  "Lakeith Stanfield",
  "Caleb Landry Jones",
  "Adam Brody",
  "Sterling K. Brown",
  "Tilda Swinton",
  
  // TV → Film Crossover
  "Bob Odenkirk",
  "Jeremy Strong",
  "Sarah Snook",
  "Kieran Culkin",
  "Brian Cox",
  "Matthew Macfadyen",
  "Phoebe Waller-Bridge",
  "Millie Bobby Brown",
  
  // European Cinema
  "Isabelle Huppert",
  "Marion Cotillard",
  "Vincent Cassel",
  "Mathieu Amalric",
  "Jean-Louis Trintignant",
  "Stellan Skarsgård",
  "Noomi Rapace",
  
  // Asian Cinema
  "Tony Leung",
  "Takeshi Kitano",
  "Ken Watanabe",
  "Gong Li",
  "Zhang Ziyi",
  "Andy Lau",
  "Donnie Yen",
  "Irrfan Khan",
  "Nawazuddin Siddiqui"
];

interface TMDBActor {
  id: number;
  name: string;
  biography?: string;
  birthday?: string;
  place_of_birth?: string;
  profile_path?: string;
  known_for_department?: string;
}

interface TMDBMovie {
  id: number;
  title: string;
  release_date: string;
  overview?: string;
  character?: string;
  order?: number;
}

interface TMDBMovieDetails {
  id: number;
  title: string;
  release_date: string;
  overview?: string;
  runtime?: number;
  genres?: Array<{ id: number; name: string }>;
}

interface TMDBMovieCredits {
  crew: Array<{ job?: string; name?: string }>;
}

async function searchActorOnTMDB(actorName: string): Promise<TMDBActor | null> {
  try {
    const url = `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(actorName)}&language=en-US&page=1&include_adult=false`;
    const response = await axios.get(url);
    
    if (response.data.results && response.data.results.length > 0) {
      const actor = response.data.results[0];
      
      // Get detailed actor info
      const detailsUrl = `${TMDB_BASE_URL}/person/${actor.id}?api_key=${TMDB_API_KEY}&language=en-US`;
      const detailsResponse = await axios.get(detailsUrl);
      
      return detailsResponse.data;
    }
    
    return null;
  } catch (error) {
    console.error(`Error searching for actor ${actorName}:`, error);
    return null;
  }
}

async function getActorFilmography(actorId: number): Promise<TMDBMovie[]> {
  try {
    const url = `${TMDB_BASE_URL}/person/${actorId}/movie_credits?api_key=${TMDB_API_KEY}&language=en-US`;
    const response = await axios.get(url);
    
    // Filter and sort movies
    const movies: TMDBMovie[] = response.data.cast || [];
    
    // Filter out movies without release dates and sort by release date
    const filteredMovies = movies
      .filter(movie => movie.release_date && movie.title)
      .filter(movie => {
        // Exclude adult content and TV movies
        const titleLower = movie.title.toLowerCase();
        const excludedTerms = ['xxx', 'porn', 'adult', 'erotic'];
        return !excludedTerms.some(term => titleLower.includes(term));
      })
      .sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime());
    
    // Return FULL filmography
    return filteredMovies;
  } catch (error) {
    console.error(`Error fetching filmography for actor ${actorId}:`, error);
    return [];
  }
}

async function getMovieDetails(movieId: number): Promise<TMDBMovieDetails | null> {
  try {
    const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching movie details for ${movieId}:`, error);
    return null;
  }
}

async function getMovieDirector(movieId: number): Promise<string> {
  try {
    const url = `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_API_KEY}&language=en-US`;
    const response = await axios.get<TMDBMovieCredits>(url);
    
    const director = response.data.crew?.find((member) => member.job === 'Director')?.name || 'Unknown';
    return director;
  } catch (error) {
    console.error(`Error fetching director for movie ${movieId}:`, error);
    return 'Unknown';
  }
}

async function createSlug(name: string): Promise<string> {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function addActorWithFilmography(actorName: string): Promise<void> {
  console.log(`\n🎭 Processing actor: ${actorName}`);
  
  // Check if actor already exists
  const existingActor = await prisma.actor.findFirst({
    where: { name: actorName }
  });
  
  if (existingActor) {
    console.log(`  ⏭️  Actor already exists: ${actorName}`);
    return;
  }
  
  // Search for actor on TMDB
  const tmdbActor = await searchActorOnTMDB(actorName);
  await sleep(300); // Rate limiting
  
  if (!tmdbActor) {
    console.log(`  ❌ Actor not found on TMDB: ${actorName}`);
    return;
  }
  
  console.log(`  ✅ Found on TMDB: ${tmdbActor.name} (ID: ${tmdbActor.id})`);
  
  // Get actor's filmography
  const filmography = await getActorFilmography(tmdbActor.id);
  await sleep(300); // Rate limiting
  
  console.log(`  📽️  Found ${filmography.length} movies in filmography`);
  
  // Create actor in database
  const slug = await createSlug(tmdbActor.name);
  const imageUrl = tmdbActor.profile_path 
    ? `https://image.tmdb.org/t/p/w500${tmdbActor.profile_path}`
    : null;
  
  const actor = await prisma.actor.create({
    data: {
      name: tmdbActor.name,
      slug,
      bio: tmdbActor.biography || null,
      imageUrl,
      birthDate: tmdbActor.birthday ? new Date(tmdbActor.birthday) : null,
      nationality: tmdbActor.place_of_birth || null,
      tmdbId: tmdbActor.id,
      knownFor: tmdbActor.known_for_department || null
    }
  });
  
  console.log(`  🆕 Actor created`);
  
  // Add movies AND performances with character names
  let moviesAdded = 0;
  let moviesExisting = 0;
  let performancesCreated = 0;
  
  for (const movieData of filmography) {
    try {
      const year = new Date(movieData.release_date).getFullYear();
      
      if (isNaN(year) || year < 1900 || year > 2030) {
        continue;
      }
      
      // Check if movie exists
      let movie = await prisma.movie.findFirst({
        where: {
          title: movieData.title,
          year: year
        }
      });
      
      if (!movie) {
        // Get movie details
        const movieDetails = await getMovieDetails(movieData.id);
        await sleep(200);
        
        if (!movieDetails) continue;
        
        const director = await getMovieDirector(movieData.id);
        await sleep(200);
        
        const movieSlug = await createSlug(movieDetails.title);
        const genre = movieDetails.genres?.map(g => g.name).join(', ') || null;
        
        try {
          movie = await prisma.movie.create({
            data: {
              title: movieDetails.title,
              slug: movieSlug,
              year,
              director,
              genre,
              overview: movieDetails.overview || null,
              tmdbId: movieDetails.id
            }
          });
          moviesAdded++;
        } catch (error) {
          // Movie might exist with same tmdbId
          movie = await prisma.movie.findFirst({
            where: {
              OR: [
                { tmdbId: movieDetails.id },
                { title: movieData.title, year: year }
              ]
            }
          });
          if (!movie) continue;
          moviesExisting++;
        }
      } else {
        moviesExisting++;
      }
      
      // CREATE PERFORMANCE RECORD with character name
      const characterName = movieData.character || `Character in ${movie.title}`;
      
      const existingPerformance = await prisma.performance.findUnique({
        where: {
          userId_actorId_movieId: {
            userId: 'system',
            actorId: actor.id,
            movieId: movie.id
          }
        }
      });
      
      if (!existingPerformance) {
        await prisma.performance.create({
          data: {
            userId: 'system',
            actorId: actor.id,
            movieId: movie.id,
            character: characterName,
            emotionalRangeDepth: 0,
            characterBelievability: 0,
            technicalSkill: 0,
            screenPresence: 0,
            chemistryInteraction: 0,
            comment: null
          }
        });
        performancesCreated++;
      }
      
    } catch (error) {
      // Skip problematic movies
    }
  }
  
  console.log(`  ✅ ${moviesAdded} new movies, ${moviesExisting} existing, ${performancesCreated} performances`);
}

// Get actors for this batch
const startIdx = (batchNumber - 1) * batchSize;
const endIdx = startIdx + batchSize;
const TIER_2_ACTORS = ALL_TIER_2_ACTORS.slice(startIdx, endIdx);

async function main() {
  console.log('🚀 TIER 2 Actor Addition - BATCH MODE (Modern Prestige)');
  console.log(`📦 Batch ${batchNumber} of ${Math.ceil(ALL_TIER_2_ACTORS.length / batchSize)}`);
  console.log(`📋 Processing ${TIER_2_ACTORS.length} actors (indices ${startIdx}-${endIdx-1})\n`);
  
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not set!');
    process.exit(1);
  }
  
  if (TIER_2_ACTORS.length === 0) {
    console.log('✅ No more actors in this batch');
    return;
  }
  
  let successCount = 0;
  
  for (let i = 0; i < TIER_2_ACTORS.length; i++) {
    const actorName = TIER_2_ACTORS[i];
    
    try {
      console.log(`\n[${i + 1}/${TIER_2_ACTORS.length}]`);
      await addActorWithFilmography(actorName);
      successCount++;
    } catch (error) {
      console.error(`\n❌ Error: ${actorName}`, error);
    }
    
    await sleep(300);
  }
  
  const totalActors = await prisma.actor.count();
  
  console.log(`\n\n🎉 Batch ${batchNumber} Complete!`);
  console.log(`✅ Processed: ${successCount}/${TIER_2_ACTORS.length}`);
  console.log(`📈 Total actors in DB: ${totalActors}\n`);
  
  if (endIdx < ALL_TIER_2_ACTORS.length) {
    console.log(`⏭️  Run next batch with: npx tsx scripts/add-tier2-actors.ts ${batchNumber + 1}`);
  } else {
    console.log(`🎊 ALL TIER 2 ACTORS ADDED!`);
  }
}

main()
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
