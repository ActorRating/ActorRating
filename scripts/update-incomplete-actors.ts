import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Actors that were added with only 30 performances (from batches 1-3)
const ACTORS_TO_UPDATE = [
  "Rod Steiger",
  "George C. Scott",
  "Goldie Hawn",
  "Julie Christie",
  "Max von Sydow",
  "Kate Hudson",
  "Richard Gere"
];

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

async function getActorFilmography(actorTmdbId: number): Promise<TMDBMovie[]> {
  try {
    const url = `${TMDB_BASE_URL}/person/${actorTmdbId}/movie_credits?api_key=${TMDB_API_KEY}&language=en-US`;
    const response = await axios.get(url);
    
    const movies: TMDBMovie[] = response.data.cast || [];
    
    const filteredMovies = movies
      .filter(movie => movie.release_date && movie.title)
      .filter(movie => {
        const titleLower = movie.title.toLowerCase();
        const excludedTerms = ['xxx', 'porn', 'adult', 'erotic'];
        return !excludedTerms.some(term => titleLower.includes(term));
      })
      .sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
      });
    
    return filteredMovies;
  } catch (error) {
    console.error(`Error fetching filmography:`, error);
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

async function updateActorFilmography(actorName: string): Promise<void> {
  console.log(`\n🎭 Updating: ${actorName}`);
  
  const actor = await prisma.actor.findFirst({
    where: { name: actorName },
    include: { performances: true }
  });
  
  if (!actor) {
    console.log(`  ❌ Actor not found in database`);
    return;
  }
  
  if (!actor.tmdbId) {
    console.log(`  ❌ No TMDB ID`);
    return;
  }
  
  console.log(`  📊 Current performances: ${actor.performances.length}`);
  
  // Get full filmography
  const filmography = await getActorFilmography(actor.tmdbId);
  await sleep(250);
  
  console.log(`  📽️  Full filmography: ${filmography.length} movies`);
  
  if (filmography.length <= actor.performances.length) {
    console.log(`  ✅ Already has full filmography`);
    return;
  }
  
  let newMoviesAdded = 0;
  let newPerformancesAdded = 0;
  
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
          newMoviesAdded++;
        } catch (error) {
          // Movie might already exist with same tmdbId or slug
          movie = await prisma.movie.findFirst({
            where: {
              OR: [
                { tmdbId: movieDetails.id },
                { title: movieData.title, year: year }
              ]
            }
          });
          if (!movie) continue;
        }
      }
      
      // Check if performance exists
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
        const characterName = movieData.character || `Character in ${movie.title}`;
        
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
        newPerformancesAdded++;
      }
      
    } catch (error) {
      // Skip problematic movies
    }
  }
  
  console.log(`  ✅ Added ${newMoviesAdded} movies, ${newPerformancesAdded} performances`);
  console.log(`  📊 Total performances now: ${actor.performances.length + newPerformancesAdded}`);
}

async function main() {
  console.log('🔧 Updating Actors with Incomplete Filmographies');
  console.log(`📋 Actors to update: ${ACTORS_TO_UPDATE.length}\n`);
  
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not set!');
    process.exit(1);
  }
  
  for (let i = 0; i < ACTORS_TO_UPDATE.length; i++) {
    const actorName = ACTORS_TO_UPDATE[i];
    
    try {
      console.log(`\n[${i + 1}/${ACTORS_TO_UPDATE.length}]`);
      await updateActorFilmography(actorName);
    } catch (error) {
      console.error(`\n❌ Error updating ${actorName}:`, error);
    }
    
    await sleep(500);
  }
  
  console.log('\n\n🎉 Update Complete!');
}

main()
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
