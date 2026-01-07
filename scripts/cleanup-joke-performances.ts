#!/usr/bin/env ts-node

/**
 * Cleanup script to remove joke performances from the database.
 * 
 * This script identifies and removes:
 * - TikTok sagas
 * - YouTube skits
 * - Web shorts
 * - Meme content
 * - Fan edits
 * - "Director's cut" of social media content
 * - Roles that are parody-only or non-acting
 */

import { PrismaClient } from '@prisma/client';
import { isJokePerformance } from '../src/lib/joke-performance-filter';

const prisma = new PrismaClient();

async function cleanupJokePerformances() {
  try {
    console.log('🧹 Starting cleanup of joke performances...\n');

    // 1. Get all movies
    console.log('📽️  Fetching all movies...');
    const allMovies = await prisma.movie.findMany({
      include: {
        performances: {
          include: {
            actor: {
              select: { name: true }
            }
          }
        },
        _count: {
          select: { performances: true }
        }
      }
    });

    console.log(`✅ Found ${allMovies.length} movies\n`);

    // 2. Identify joke movies
    console.log('🔍 Identifying joke performances...');
    const jokeMovies: typeof allMovies = [];
    const jokePerformances: Array<{
      id: string;
      actorName: string;
      movieTitle: string;
      movieYear: number;
    }> = [];

    for (const movie of allMovies) {
      if (isJokePerformance(movie.title, movie.overview, movie.year, movie.director)) {
        jokeMovies.push(movie);
        
        // Collect all performances for this movie
        for (const perf of movie.performances) {
          jokePerformances.push({
            id: perf.id,
            actorName: perf.actor.name,
            movieTitle: movie.title,
            movieYear: movie.year
          });
        }
      }
    }

    console.log(`⚠️  Found ${jokeMovies.length} joke movies`);
    console.log(`⚠️  Found ${jokePerformances.length} joke performances\n`);

    if (jokePerformances.length === 0) {
      console.log('✅ No joke performances found. Database is clean!');
      return;
    }

    // 3. Show FULL list of what will be deleted
    console.log('📋 COMPLETE LIST OF JOKE PERFORMANCES TO BE DELETED:\n');
    console.log('═'.repeat(80));
    
    // Group by movie for better readability
    const groupedByMovie = new Map<string, typeof jokePerformances>();
    for (const perf of jokePerformances) {
      const key = `${perf.movieTitle} (${perf.movieYear})`;
      if (!groupedByMovie.has(key)) {
        groupedByMovie.set(key, []);
      }
      groupedByMovie.get(key)!.push(perf);
    }

    let index = 1;
    for (const [movieKey, perfs] of groupedByMovie.entries()) {
      const firstPerf = perfs[0];
      console.log(`\n${index}. MOVIE: "${firstPerf.movieTitle}" (${firstPerf.movieYear})`);
      console.log(`   Performances in this movie (${perfs.length}):`);
      perfs.forEach((perf, i) => {
        console.log(`      ${i + 1}. ${perf.actorName} (Performance ID: ${perf.id})`);
      });
      index++;
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`\n⚠️  TOTAL: ${jokePerformances.length} performances will be deleted\n`);

    // 4. Require confirmation
    console.log('⚠️  WARNING: This will permanently delete the above performances!');
    console.log('⚠️  Make sure you have reviewed the list above.\n');
    
    // In a real scenario, you might want to use readline for interactive confirmation
    // For now, we'll proceed but log a clear warning
    console.log('🗑️  Proceeding with deletion in 3 seconds...');
    console.log('   (Press Ctrl+C to cancel)\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. Delete performances
    console.log('🗑️  Deleting joke performances...');
    const performanceIds = jokePerformances.map(p => p.id);
    
    const deleteResult = await prisma.performance.deleteMany({
      where: {
        id: {
          in: performanceIds
        }
      }
    });

    console.log(`✅ Deleted ${deleteResult.count} performances\n`);

    // 6. Check for orphaned movies (movies with no remaining performances)
    console.log('🔍 Checking for orphaned movies...');
    const orphanedMovies: string[] = [];

    for (const movie of jokeMovies) {
      const remainingPerformances = await prisma.performance.count({
        where: { movieId: movie.id }
      });

      if (remainingPerformances === 0) {
        orphanedMovies.push(movie.id);
      }
    }

    if (orphanedMovies.length > 0) {
      console.log(`⚠️  Found ${orphanedMovies.length} orphaned movies (no remaining performances)`);
      console.log('   These movies will be deleted...\n');

      const deleteMoviesResult = await prisma.movie.deleteMany({
        where: {
          id: {
            in: orphanedMovies
          }
        }
      });

      console.log(`✅ Deleted ${deleteMoviesResult.count} orphaned movies\n`);
    } else {
      console.log('✅ No orphaned movies found\n');
    }

    // 7. Final summary
    console.log('📊 Cleanup Summary:');
    console.log(`   - Joke movies identified: ${jokeMovies.length}`);
    console.log(`   - Joke performances deleted: ${deleteResult.count}`);
    console.log(`   - Orphaned movies deleted: ${orphanedMovies.length}`);
    console.log('\n✅ Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupJokePerformances()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

