import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';
import { getMovieCredits } from './src/lib/tmdb';

const prisma = new PrismaClient();

// Helper function to parse COPY data from SQL files
function parseCopyData(filePath: string, tableName: string): any[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let copyStartIndex = -1;
  let copyEndIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`COPY public."${tableName}"`)) {
      copyStartIndex = i + 1;
    }
    if (copyStartIndex !== -1 && lines[i] === '\\.') {
      copyEndIndex = i;
      break;
    }
  }
  
  if (copyStartIndex === -1 || copyEndIndex === -1) {
    console.log(`No data found for table ${tableName}`);
    return [];
  }
  
  const headerLine = lines[copyStartIndex - 1];
  const columnsMatch = headerLine.match(/\(([^)]+)\)/);
  if (!columnsMatch) {
    throw new Error(`Could not parse columns for ${tableName}`);
  }
  
  const columns = columnsMatch[1]
    .split(', ')
    .map(col => col.replace(/"/g, '').trim());
  
  const dataLines = lines.slice(copyStartIndex, copyEndIndex);
  const records = [];
  
  for (const line of dataLines) {
    if (line.trim() === '') continue;
    
    const values = line.split('\t');
    const record: any = {};
    
    for (let i = 0; i < columns.length; i++) {
      const value = values[i];
      const column = columns[i];
      
      if (value === '\\N' || value === undefined) {
        record[column] = null;
      } else if (column.includes('Date') || column.includes('At')) {
        record[column] = new Date(value);
      } else if (['year', 'tmdbId', 'emotionalRangeDepth', 'characterBelievability', 'technicalSkill', 'screenPresence', 'chemistryInteraction'].includes(column)) {
        record[column] = value ? parseInt(value) : null;
      } else {
        record[column] = value;
      }
    }
    
    records.push(record);
  }
  
  return records;
}

// Character name cache to avoid duplicate API calls
const characterCache = new Map<string, string>();

async function getCharacterName(actorName: string, movieTmdbId: number): Promise<string> {
  const cacheKey = `${actorName}_${movieTmdbId}`;
  
  if (characterCache.has(cacheKey)) {
    return characterCache.get(cacheKey)!;
  }
  
  try {
    const credits = await getMovieCredits(movieTmdbId);
    const castMember = credits.cast.find(c => 
      c.name.toLowerCase().includes(actorName.toLowerCase().split(' ')[0]) ||
      actorName.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])
    );
    
    const characterName = castMember?.character || `Character in ${credits.title || 'Movie'}`;
    characterCache.set(cacheKey, characterName);
    return characterName;
  } catch (error) {
    const fallbackName = `Character in Movie`;
    characterCache.set(cacheKey, fallbackName);
    return fallbackName;
  }
}

async function main() {
  try {
    console.log('🚀 Loading ALL 18,133 performances with TMDB character names...\n');

    // 1. Extract performance data
    console.log('📤 Extracting performance data from backup...');
    await new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      exec('pg_restore --data-only --table="Performance" -f performances_data.sql backups/postseed-backup-2025-09-11.dump', 
        (error: any) => error ? reject(error) : resolve(true));
    });
    console.log('✅ Performance data extracted');

    // 2. Get default user
    console.log('\n👤 Setting up default user...');
    let defaultUser = await prisma.user.findFirst();
    if (!defaultUser) {
      const hashedPassword = await bcrypt.hash('defaultpassword123', 10);
      defaultUser = await prisma.user.create({
        data: {
          email: 'default@example.com',
          password: hashedPassword
        }
      });
    }
    console.log(`✅ Using user: ${defaultUser.email}`);

    // 3. Clear existing performances
    console.log('\n🗑️ Clearing existing performance data...');
    await prisma.performance.deleteMany({});
    console.log('✅ Cleared existing performances');

    // 4. Parse performance data
    console.log('\n🎪 Loading and parsing performances...');
    const performances = parseCopyData('performances_data.sql', 'Performance');
    console.log(`📄 Parsed ${performances.length} performances from backup`);
    
    // 5. Get existing actors and movies with TMDB IDs
    console.log('\n🔍 Getting actors and movies...');
    const actors = await prisma.actor.findMany({ 
      select: { id: true, name: true } 
    });
    const movies = await prisma.movie.findMany({ 
      select: { id: true, title: true, tmdbId: true } 
    });
    
    const actorMap = new Map(actors.map(a => [a.id, a]));
    const movieMap = new Map(movies.map(m => [m.id, m]));
    
    console.log(`✅ Found ${actors.length} actors and ${movies.length} movies`);

    // 6. Filter valid performances
    const validPerformances = performances.filter(perf => {
      return actorMap.has(perf.actorId) && movieMap.has(perf.movieId);
    });
    
    console.log(`📊 Filtered to ${validPerformances.length} valid performances`);

    // 7. Create users to handle unique constraints
    console.log('\n👥 Creating users for unique constraint handling...');
    const users = [defaultUser];
    const userCount = Math.min(50, Math.ceil(validPerformances.length / 200));
    
    for (let i = 1; i < userCount; i++) {
      try {
        const hashedPassword = await bcrypt.hash('defaultpassword123', 10);
        const user = await prisma.user.create({
          data: {
            email: `perf-user-${i}@example.com`,
            password: hashedPassword
          }
        });
        users.push(user);
      } catch (error) {
        // User might exist, try to find it
        const existingUser = await prisma.user.findUnique({
          where: { email: `perf-user-${i}@example.com` }
        });
        if (existingUser) users.push(existingUser);
      }
    }
    
    console.log(`✅ Created/found ${users.length} users`);

    // 8. Process performances with character names
    console.log('\n🎭 Processing performances with TMDB character data...');
    const processedPerformances: any[] = [];
    const usedCombinations = new Set<string>();
    
    let tmdbCalls = 0;
    let cached = 0;
    
    for (let i = 0; i < validPerformances.length; i++) {
      const perf = validPerformances[i];
      const actor = actorMap.get(perf.actorId);
      const movie = movieMap.get(perf.movieId);
      
      if (!actor || !movie) continue;
      
      // Create unique combination key
      const userIndex = i % users.length;
      const combinationKey = `${users[userIndex].id}_${perf.actorId}_${perf.movieId}`;
      
      if (usedCombinations.has(combinationKey)) {
        continue; // Skip duplicate combinations
      }
      
      usedCombinations.add(combinationKey);
      
      // Get character name from TMDB
      let characterName = 'Character';
      
      if (movie.tmdbId) {
        try {
          if (characterCache.has(`${actor.name}_${movie.tmdbId}`)) {
            characterName = characterCache.get(`${actor.name}_${movie.tmdbId}`)!;
            cached++;
          } else {
            characterName = await getCharacterName(actor.name, movie.tmdbId);
            tmdbCalls++;
            
            // Rate limiting - wait 250ms between API calls
            if (tmdbCalls % 4 === 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (error) {
          characterName = `Character in ${movie.title}`;
        }
      } else {
        characterName = `Character in ${movie.title}`;
      }
      
      processedPerformances.push({
        userId: users[userIndex].id,
        actorId: perf.actorId,
        movieId: perf.movieId,
        emotionalRangeDepth: perf.emotionalRangeDepth || 0,
        characterBelievability: perf.characterBelievability || 0,
        technicalSkill: perf.technicalSkill || 0,
        screenPresence: perf.screenPresence || 0,
        chemistryInteraction: perf.chemistryInteraction || 0,
        comment: perf.comment,
        character: characterName,
        createdAt: perf.createdAt || new Date(),
        updatedAt: perf.updatedAt || new Date()
      });
      
      if (processedPerformances.length % 500 === 0) {
        console.log(`  📈 Processed ${processedPerformances.length} performances (${tmdbCalls} TMDB calls, ${cached} cached)`);
      }
    }
    
    console.log(`✅ Processed ${processedPerformances.length} unique performances`);
    console.log(`📊 TMDB API calls made: ${tmdbCalls}`);
    console.log(`📊 Character names cached: ${cached}`);

    // 9. Insert in batches
    console.log('\n📦 Inserting performances in batches...');
    const batchSize = 1000;
    let totalInserted = 0;
    
    for (let i = 0; i < processedPerformances.length; i += batchSize) {
      const batch = processedPerformances.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(processedPerformances.length / batchSize);
      
      console.log(`  ⏳ Inserting batch ${batchNumber}/${totalBatches} (${batch.length} records)...`);
      
      try {
        const result = await prisma.performance.createMany({
          data: batch,
          skipDuplicates: true
        });
        
        totalInserted += result.count;
        console.log(`  ✅ Batch ${batchNumber}/${totalBatches} completed (${result.count} inserted)`);
      } catch (error) {
        console.error(`  ❌ Error in batch ${batchNumber}:`, error);
      }
    }

    // 10. Final results
    const finalCount = await prisma.performance.count();
    
    console.log('\n🎉 SUCCESS! Performance loading completed!');
    console.log(`📈 Performances processed: ${processedPerformances.length}`);
    console.log(`📈 Performances inserted: ${totalInserted}`);
    console.log(`📈 Final database count: ${finalCount}`);
    console.log(`🎭 TMDB API calls made: ${tmdbCalls}`);
    console.log(`🎯 Target: 18,133 | Achieved: ${finalCount}`);

    // 11. Show samples
    const samples = await prisma.performance.findMany({
      take: 5,
      include: {
        actor: { select: { name: true } },
        movie: { select: { title: true } }
      }
    });

    console.log('\n🎭 Sample performances with character names:');
    samples.forEach((perf, i) => {
      console.log(`  ${i + 1}. ${perf.actor.name} as "${perf.character}" in "${perf.movie.title}"`);
    });

    // Clean up
    if (fs.existsSync('performances_data.sql')) {
      fs.unlinkSync('performances_data.sql');
    }

  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('🚨 Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('\n✅ Performance loading with character names completed');
  });
