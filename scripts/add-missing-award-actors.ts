import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const ACTORS_TO_ADD = [
  "Wagner Moura",
  "Renate Reinsve",
  "Delroy Lindo",
  "Inga Ibsdotter Lilleaas",
  "Amy Madigan",
  "Wunmi Mosaku",
  "Teyana Taylor"
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
  
  const existingActor = await prisma.actor.findFirst({
    where: { name: actorName }
  });
  
  if (existingActor) {
    console.log(`  ⏭️  Already exists`);
    return;
  }
  
  const tmdbActor = await searchActorOnTMDB(actorName);
  await sleep(250);
  
  if (!tmdbActor) {
    console.log(`  ❌ Not found on TMDB`);
    return;
  }
  
  console.log(`  ✅ Found on TMDB (ID: ${tmdbActor.id})`);
  
  const filmography = await getActorFilmography(tmdbActor.id);
  await sleep(250);
  
  console.log(`  📽️  Found ${filmography.length} movies in full filmography`);
  
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
  
  let moviesAdded = 0;
  let moviesExisting = 0;
  let performancesCreated = 0;
  
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
          moviesAdded++;
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
          moviesExisting++;
        }
      } else {
        moviesExisting++;
      }
      
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

async function fixJacobElordiFrankenstein(): Promise<void> {
  console.log(`\n🔧 Fixing: Jacob Elordi in "Frankenstein" (2007)`);
  
  const actor = await prisma.actor.findFirst({
    where: { name: 'Jacob Elordi' }
  });
  
  if (!actor) {
    console.log(`  ❌ Jacob Elordi not found in database`);
    return;
  }
  
  // Search for Frankenstein 2007
  const movie = await prisma.movie.findFirst({
    where: {
      title: {
        contains: 'Frankenstein',
        mode: 'insensitive'
      },
      year: 2007
    }
  });
  
  if (!movie) {
    console.log(`  ⚠️  Frankenstein (2007) not found. Searching TMDB...`);
    
    try {
      const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=Frankenstein&year=2007`;
      const searchRes = await axios.get(searchUrl);
      
      if (searchRes.data.results && searchRes.data.results.length > 0) {
        const tmdbMovie = searchRes.data.results[0];
        console.log(`  ✅ Found on TMDB: ${tmdbMovie.title} (ID: ${tmdbMovie.id})`);
        
        // Get movie details
        const detailsUrl = `${TMDB_BASE_URL}/movie/${tmdbMovie.id}?api_key=${TMDB_API_KEY}`;
        const detailsRes = await axios.get(detailsUrl);
        const movieData = detailsRes.data;
        
        // Get credits to find Jacob Elordi's character
        const creditsUrl = `${TMDB_BASE_URL}/movie/${tmdbMovie.id}/credits?api_key=${TMDB_API_KEY}`;
        const creditsRes = await axios.get(creditsUrl);
        const cast = creditsRes.data.cast || [];
        const jacobRole = cast.find((c: any) => 
          c.name.toLowerCase().includes('jacob') || 
          c.name.toLowerCase().includes('elordi')
        );
        
        const director = creditsRes.data.crew?.find((c: any) => c.job === 'Director')?.name || 'Unknown';
        const genre = movieData.genres?.map((g: any) => g.name).join(', ') || null;
        
        const movieSlug = movieData.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
        
        const createdMovie = await prisma.movie.create({
          data: {
            title: movieData.title,
            slug: movieSlug,
            year: 2007,
            director,
            genre,
            overview: movieData.overview || null,
            tmdbId: movieData.id
          }
        });
        
        const characterName = jacobRole?.character || 'Character';
        
        await prisma.performance.create({
          data: {
            userId: 'system',
            actorId: actor.id,
            movieId: createdMovie.id,
            character: characterName,
            emotionalRangeDepth: 0,
            characterBelievability: 0,
            technicalSkill: 0,
            screenPresence: 0,
            chemistryInteraction: 0,
            comment: null
          }
        });
        
        console.log(`  ✅ Created movie and performance link`);
      } else {
        console.log(`  ❌ Frankenstein (2007) not found on TMDB`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
    }
  } else {
    // Movie exists, just create the performance link
    const existingPerformance = await prisma.performance.findUnique({
      where: {
        userId_actorId_movieId: {
          userId: 'system',
          actorId: actor.id,
          movieId: movie.id
        }
      }
    });
    
    if (existingPerformance) {
      console.log(`  ⏭️  Performance already exists`);
    } else {
      await prisma.performance.create({
        data: {
          userId: 'system',
          actorId: actor.id,
          movieId: movie.id,
          character: 'Character',
          emotionalRangeDepth: 0,
          characterBelievability: 0,
          technicalSkill: 0,
          screenPresence: 0,
          chemistryInteraction: 0,
          comment: null
        }
      });
      console.log(`  ✅ Performance link created`);
    }
  }
}

async function main() {
  console.log('🚀 Adding Missing Award Actors');
  console.log(`📋 Total actors to add: ${ACTORS_TO_ADD.length}\n`);
  
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not set!');
    process.exit(1);
  }
  
  let successCount = 0;
  
  for (let i = 0; i < ACTORS_TO_ADD.length; i++) {
    const actorName = ACTORS_TO_ADD[i];
    
    try {
      console.log(`\n[${i + 1}/${ACTORS_TO_ADD.length}]`);
      await addActorWithFilmography(actorName);
      successCount++;
    } catch (error) {
      console.error(`\n❌ Error: ${actorName}`, error);
    }
    
    await sleep(500);
  }
  
  // Fix Jacob Elordi performance
  await fixJacobElordiFrankenstein();
  
  const totalActors = await prisma.actor.count();
  const totalMovies = await prisma.movie.count();
  const totalPerformances = await prisma.performance.count();
  
  console.log(`\n\n🎉 Addition Complete!`);
  console.log(`📊 Final Stats:`);
  console.log(`   ✅ Successfully added: ${successCount}/${ACTORS_TO_ADD.length}`);
  console.log(`\n📈 Updated Database Stats:`);
  console.log(`   🎭 Total Actors: ${totalActors}`);
  console.log(`   🎬 Total Movies: ${totalMovies}`);
  console.log(`   🎪 Total Performances: ${totalPerformances}\n`);
}

main()
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
