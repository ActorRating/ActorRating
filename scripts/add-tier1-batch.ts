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

// TIER 1 Actors - ALL 57 actors
const ALL_TIER_1_ACTORS = [
  // Classic Hollywood Legends
  "Audrey Hepburn",
  "Katharine Hepburn",
  "Bette Davis",
  "Elizabeth Taylor",
  "Ingrid Bergman",
  "Grace Kelly",
  "Sophia Loren",
  "Joan Fontaine",
  "Barbara Stanwyck",
  "Lauren Bacall",
  "Rita Hayworth",
  "Ava Gardner",
  "Gloria Swanson",
  "James Mason",
  "Jack Lemmon",
  "Montgomery Clift",
  "Peter Finch",
  "Rod Steiger",
  "George C. Scott",
  
  // 70s-80s Icons
  "Goldie Hawn",
  "Diane Keaton",
  "Jane Fonda",
  "Sissy Spacek",
  "Jessica Lange",
  "Gene Wilder",
  "Chevy Chase",
  "John Hurt",
  "Donald Sutherland",
  "Julie Christie",
  "Max von Sydow",
  "Robert Shaw",
  
  // 90s-2000s A-List
  "Kate Hudson",
  "Richard Gere",
  "Uma Thurman",
  "Michael Keaton",
  "Michelle Pfeiffer",
  "Meg Ryan",
  "Winona Ryder",
  "Cameron Diaz",
  "Demi Moore",
  "Sharon Stone",
  "Julia Stiles",
  "Neve Campbell",
  "Renée Zellweger",
  "Gwyneth Paltrow",
  "Hilary Swank",
  "Antonio Banderas",
  "Val Kilmer",
  "Christian Slater",
  "Ralph Macchio",
  "Bruce Dern",
  "Gary Busey",
  "Wesley Snipes",
  "Faye Dunaway",
  "Shirley MacLaine"
];

// Get actors for this batch
const startIdx = (batchNumber - 1) * batchSize;
const endIdx = startIdx + batchSize;
const TIER_1_ACTORS = ALL_TIER_1_ACTORS.slice(startIdx, endIdx);

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
    
    const movies: TMDBMovie[] = response.data.cast || [];
    
    // Filter and sort - GET FULL FILMOGRAPHY like existing actors
    const filteredMovies = movies
      .filter(movie => movie.release_date && movie.title)
      .filter(movie => {
        const titleLower = movie.title.toLowerCase();
        const excludedTerms = ['xxx', 'porn', 'adult', 'erotic'];
        return !excludedTerms.some(term => titleLower.includes(term));
      })
      .sort((a, b) => {
        // Sort by order (lower is better) then by release date
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
      });
    
    // Return full filmography (no limit)
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
  console.log(`\n🎭 Processing: ${actorName}`);
  
  // Check if actor already exists
  const existingActor = await prisma.actor.findFirst({
    where: { name: actorName }
  });
  
  if (existingActor) {
    console.log(`  ⏭️  Already exists`);
    return;
  }
  
  // Search for actor on TMDB
  const tmdbActor = await searchActorOnTMDB(actorName);
  await sleep(250);
  
  if (!tmdbActor) {
    console.log(`  ❌ Not found on TMDB`);
    return;
  }
  
  console.log(`  ✅ Found on TMDB (ID: ${tmdbActor.id})`);
  
  // Get actor's filmography
  const filmography = await getActorFilmography(tmdbActor.id);
  await sleep(250);
  
  console.log(`  📽️  Found ${filmography.length} movies in full filmography`);
  
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
      } else {
        moviesExisting++;
      }
      
      // CREATE PERFORMANCE RECORD with character name
      const characterName = movieData.character || `Character in ${movie.title}`;
      
      // Check if performance already exists
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
      console.error(`      Error: ${error}`);
    }
  }
  
  console.log(`  ✅ ${moviesAdded} new movies, ${moviesExisting} existing, ${performancesCreated} performances`);
}

async function main() {
  console.log('🚀 TIER 1 Actor Addition - BATCH MODE');
  console.log(`📦 Batch ${batchNumber} of ${Math.ceil(ALL_TIER_1_ACTORS.length / batchSize)}`);
  console.log(`📋 Processing ${TIER_1_ACTORS.length} actors (indices ${startIdx}-${endIdx-1})\n`);
  
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not set!');
    process.exit(1);
  }
  
  if (TIER_1_ACTORS.length === 0) {
    console.log('✅ No more actors in this batch');
    return;
  }
  
  let successCount = 0;
  
  for (let i = 0; i < TIER_1_ACTORS.length; i++) {
    const actorName = TIER_1_ACTORS[i];
    
    try {
      console.log(`\n[${i + 1}/${TIER_1_ACTORS.length}]`);
      await addActorWithFilmography(actorName);
      successCount++;
    } catch (error) {
      console.error(`\n❌ Error: ${actorName}`, error);
    }
    
    await sleep(300);
  }
  
  const totalActors = await prisma.actor.count();
  
  console.log(`\n\n🎉 Batch ${batchNumber} Complete!`);
  console.log(`✅ Processed: ${successCount}/${TIER_1_ACTORS.length}`);
  console.log(`📈 Total actors in DB: ${totalActors}\n`);
  
  // Show next batch command
  if (endIdx < ALL_TIER_1_ACTORS.length) {
    console.log(`⏭️  Run next batch with: npx tsx scripts/add-tier1-batch.ts ${batchNumber + 1}`);
  } else {
    console.log(`🎊 ALL TIER 1 ACTORS ADDED!`);
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
