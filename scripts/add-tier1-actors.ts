import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Sleep helper to avoid rate limits
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// TIER 1 Actors to Add
const TIER_1_ACTORS = [
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
    
    // Return top 50 most significant movies (or all if less than 50)
    return filteredMovies.slice(0, 50);
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
  
  console.log(`  🆕 Created actor: ${actor.name}`);
  
  // Add movies and performances
  let moviesAdded = 0;
  let moviesSkipped = 0;
  
  for (const movieData of filmography) {
    try {
      const year = new Date(movieData.release_date).getFullYear();
      
      // Skip movies without valid years
      if (isNaN(year) || year < 1900 || year > 2030) {
        moviesSkipped++;
        continue;
      }
      
      // Check if movie already exists
      let movie = await prisma.movie.findFirst({
        where: {
          title: movieData.title,
          year: year
        }
      });
      
      if (!movie) {
        // Get detailed movie info
        const movieDetails = await getMovieDetails(movieData.id);
        await sleep(250); // Rate limiting
        
        if (!movieDetails) {
          moviesSkipped++;
          continue;
        }
        
        const director = await getMovieDirector(movieData.id);
        await sleep(250); // Rate limiting
        
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
      }
      
      // Performance is created via the actors table relationship
      // No need to create Performance records here as they're user-specific
      
    } catch (error) {
      console.error(`    ⚠️  Error processing movie ${movieData.title}:`, error);
      moviesSkipped++;
    }
  }
  
  console.log(`  ✅ Completed: ${moviesAdded} movies added, ${moviesSkipped} skipped`);
}

async function main() {
  console.log('🚀 Starting TIER 1 Actor Addition');
  console.log(`📋 Total actors to process: ${TIER_1_ACTORS.length}\n`);
  
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY environment variable is not set!');
    process.exit(1);
  }
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < TIER_1_ACTORS.length; i++) {
    const actorName = TIER_1_ACTORS[i];
    
    try {
      console.log(`\n[${i + 1}/${TIER_1_ACTORS.length}]`);
      await addActorWithFilmography(actorName);
      successCount++;
      
      // Progress update every 10 actors
      if ((i + 1) % 10 === 0) {
        console.log(`\n📊 Progress: ${i + 1}/${TIER_1_ACTORS.length} actors processed`);
        console.log(`   ✅ Success: ${successCount} | ⏭️  Skipped: ${skipCount} | ❌ Errors: ${errorCount}\n`);
      }
      
    } catch (error) {
      console.error(`\n❌ Error processing ${actorName}:`, error);
      errorCount++;
    }
    
    // Wait between actors to avoid rate limiting
    await sleep(500);
  }
  
  console.log('\n\n🎉 TIER 1 Actor Addition Complete!');
  console.log(`📊 Final Stats:`);
  console.log(`   ✅ Successfully processed: ${successCount}`);
  console.log(`   ⏭️  Skipped (already exist): ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  
  // Show updated actor count
  const totalActors = await prisma.actor.count();
  console.log(`\n📈 Total actors in database: ${totalActors}`);
}

main()
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
