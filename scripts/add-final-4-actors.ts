import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const ACTORS_TO_ADD = [
  "Brian Tyree Henry",
  "Jacob Elordi", 
  "Ansel Elgort",
  "Ayo Edebiri"
];

// Use the same functions from the main script - simplified version
async function addActor(name: string) {
  console.log(`\n🎭 ${name}`);
  
  const existing = await prisma.actor.findFirst({ where: { name } });
  if (existing) {
    console.log(`  ⏭️  Already exists`);
    return;
  }
  
  try {
    const searchUrl = `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`;
    const searchRes = await axios.get(searchUrl);
    
    if (!searchRes.data.results || searchRes.data.results.length === 0) {
      console.log(`  ❌ Not found on TMDB`);
      return;
    }
    
    const tmdbActor = searchRes.data.results[0];
    console.log(`  ✅ Found: ${tmdbActor.name} (ID: ${tmdbActor.id})`);
    
    // Get details
    const detailsUrl = `${TMDB_BASE_URL}/person/${tmdbActor.id}?api_key=${TMDB_API_KEY}`;
    const detailsRes = await axios.get(detailsUrl);
    const actorData = detailsRes.data;
    
    // Get filmography
    const filmUrl = `${TMDB_BASE_URL}/person/${tmdbActor.id}/movie_credits?api_key=${TMDB_API_KEY}`;
    const filmRes = await axios.get(filmUrl);
    const movies = (filmRes.data.cast || []).filter(m => m.release_date && m.title);
    
    console.log(`  📽️  ${movies.length} movies`);
    
    // Create actor
    const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const actor = await prisma.actor.create({
      data: {
        name: actorData.name,
        slug,
        bio: actorData.biography || null,
        imageUrl: actorData.profile_path ? `https://image.tmdb.org/t/p/w500${actorData.profile_path}` : null,
        birthDate: actorData.birthday ? new Date(actorData.birthday) : null,
        nationality: actorData.place_of_birth || null,
        tmdbId: actorData.id
      }
    });
    
    // Add performances (simplified - just link to existing movies)
    let perfs = 0;
    for (const m of movies.slice(0, 50)) { // Limit to 50 for speed
      try {
        const year = new Date(m.release_date).getFullYear();
        const movie = await prisma.movie.findFirst({ where: { title: m.title, year } });
        if (movie) {
          await prisma.performance.create({
            data: {
              userId: 'system',
              actorId: actor.id,
              movieId: movie.id,
              character: m.character || 'Character',
              emotionalRangeDepth: 0,
              characterBelievability: 0,
              technicalSkill: 0,
              screenPresence: 0,
              chemistryInteraction: 0
            }
          });
          perfs++;
        }
      } catch (e) {}
    }
    
    console.log(`  ✅ ${perfs} performances created`);
  } catch (error) {
    console.log(`  ❌ Error: ${error}`);
  }
}

async function main() {
  for (const name of ACTORS_TO_ADD) {
    await addActor(name);
    await new Promise(r => setTimeout(r, 500));
  }
  
  const total = await prisma.actor.count();
  console.log(`\n📊 Total actors: ${total}`);
}

main().finally(() => prisma.$disconnect());
