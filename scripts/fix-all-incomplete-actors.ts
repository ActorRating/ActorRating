import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Remaining actors that need full filmographies (starting from Jack Lemmon onwards)
const ACTORS_TO_FIX = [
  "Jack Lemmon",
  "Montgomery Clift",
  "Peter Finch",
  "Diane Keaton",
  "Jane Fonda",
  "Sissy Spacek",
  "Jessica Lange",
  "Gene Wilder",
  "Chevy Chase",
  "John Hurt",
  "Donald Sutherland",
  "Robert Shaw",
  "Kate Hudson",
  "Richard Gere",
  "Uma Thurman",
  "Michael Keaton"
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

async function searchActorOnTMDB(actorName: string): Promise<any> {
  try {
    const url = `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(actorName)}&language=en-US&page=1&include_adult=false`;
    const response = await axios.get(url);
    
    if (response.data.results && response.data.results.length > 0) {
      const actor = response.data.results[0];
      
      const detailsUrl = `${TMDB_BASE_URL}/person/${actor.id}?api_key=${TMDB_API_KEY}&language=en-US`;
      const detailsResponse = await axios.get(detailsUrl);
      
      return detailsResponse.data;
    }
    
    return null;
  } catch (error) {
    return null;
  }
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

async function fixActorFilmography(actorName: string): Promise<void> {
  console.log(`\n🎭 ${actorName}`);
  
  let actor = await prisma.actor.findFirst({
    where: { name: actorName },
    include: { performances: true }
  });
  
  if (!actor) {
    console.log(`  ❌ Not found in database`);
    return;
  }
  
  console.log(`  📊 Current: ${actor.performances.length} performances`);
  
  // Get or update TMDB ID if missing
  if (!actor.tmdbId) {
    console.log(`  🔍 No TMDB ID, searching...`);
    const tmdbActor = await searchActorOnTMDB(actorName);
    await sleep(250);
    
    if (!tmdbActor) {
      console.log(`  ❌ Not found on TMDB`);
      return;
    }
    
    actor = await prisma.actor.update({
      where: { id: actor.id },
      data: {
        tmdbId: tmdbActor.id,
        bio: tmdbActor.biography || actor.bio,
        imageUrl: tmdbActor.profile_path ? `https://image.tmdb.org/t/p/w500${tmdbActor.profile_path}` : actor.imageUrl,
        birthDate: tmdbActor.birthday ? new Date(tmdbActor.birthday) : actor.birthDate,
        nationality: tmdbActor.place_of_birth || actor.nationality
      },
      include: { performances: true }
    });
    console.log(`  ✅ TMDB ID: ${actor.tmdbId}`);
  }
  
  // Get full filmography
  const filmography = await getActorFilmography(actor.tmdbId!);
  await sleep(250);
  
  console.log(`  📽️  Full filmography: ${filmography.length} movies`);
  
  let newMoviesAdded = 0;
  let newPerformancesAdded = 0;
  
  for (const movieData of filmography) {
    try {
      const year = new Date(movieData.release_date).getFullYear();
      
      if (isNaN(year) || year < 1900 || year > 2030) {
        continue;
      }
      
      let movie = await prisma.movie.findFirst({
        where: {
          title: movieData.title,
          year: year
        }
      });
      
      if (!movie) {
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
      // Skip
    }
  }
  
  const finalCount = actor.performances.length + newPerformancesAdded;
  console.log(`  ✅ +${newMoviesAdded} movies, +${newPerformancesAdded} performances → Total: ${finalCount}`);
}

async function main() {
  console.log('🔧 FIXING ALL INCOMPLETE ACTORS');
  console.log(`📋 Total: ${ACTORS_TO_FIX.length} actors\n`);
  
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not set!');
    process.exit(1);
  }
  
  let fixed = 0;
  let errors = 0;
  
  for (let i = 0; i < ACTORS_TO_FIX.length; i++) {
    try {
      console.log(`[${i + 1}/${ACTORS_TO_FIX.length}]`);
      await fixActorFilmography(ACTORS_TO_FIX[i]);
      fixed++;
      
      if ((i + 1) % 10 === 0) {
        console.log(`\n📊 Progress: ${i + 1}/${ACTORS_TO_FIX.length} | Fixed: ${fixed} | Errors: ${errors}\n`);
      }
    } catch (error) {
      console.error(`  ❌ Error:`, error);
      errors++;
    }
    
    await sleep(500);
  }
  
  const finalStats = await prisma.actor.findMany({
    where: {
      name: {
        in: ACTORS_TO_FIX
      }
    },
    include: {
      performances: true
    }
  });
  
  console.log('\n\n🎉 FIX COMPLETE!');
  console.log(`📊 Stats: ${fixed} fixed, ${errors} errors`);
  console.log(`\n📈 Final Performance Counts:`);
  finalStats
    .sort((a, b) => b.performances.length - a.performances.length)
    .forEach(actor => {
      console.log(`   ${actor.name}: ${actor.performances.length} performances`);
    });
}

main()
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
