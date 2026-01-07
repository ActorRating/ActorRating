#!/usr/bin/env ts-node

/**
 * Dry-run script to list joke performances that would be deleted.
 * This script does NOT delete anything - it only shows what would be removed.
 */

import { PrismaClient } from '@prisma/client';
import { isJokePerformance } from '../src/lib/joke-performance-filter';

const prisma = new PrismaClient();

async function listJokePerformances() {
  try {
    console.log('🔍 Scanning database for joke performances...\n');
    console.log('⚠️  This is a DRY RUN - nothing will be deleted.\n');

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
      movieOverview: string | null;
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
            movieYear: movie.year,
            movieOverview: movie.overview
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

    // 3. Group by movie for better readability
    console.log('📋 JOKE PERFORMANCES TO BE DELETED:\n');
    console.log('═'.repeat(80));
    
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
      if (firstPerf.movieOverview) {
        const overviewPreview = firstPerf.movieOverview.length > 100 
          ? firstPerf.movieOverview.substring(0, 100) + '...'
          : firstPerf.movieOverview;
        console.log(`   Overview: ${overviewPreview}`);
      }
      console.log(`   Performances in this movie (${perfs.length}):`);
      perfs.forEach((perf, i) => {
        console.log(`      ${i + 1}. ${perf.actorName} (Performance ID: ${perf.id})`);
      });
      index++;
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 SUMMARY:');
    console.log(`   - Total joke movies: ${jokeMovies.length}`);
    console.log(`   - Total joke performances: ${jokePerformances.length}`);
    
    // 4. Check for orphaned movies
    console.log('\n🔍 Checking for movies that would become orphaned...');
    const orphanedMovies: Array<{ title: string; year: number; id: string }> = [];

    for (const movie of jokeMovies) {
      const remainingPerformances = await prisma.performance.count({
        where: { movieId: movie.id }
      });

      if (remainingPerformances === movie.performances.length) {
        // All performances are joke performances, so movie would be orphaned
        orphanedMovies.push({
          title: movie.title,
          year: movie.year,
          id: movie.id
        });
      }
    }

    if (orphanedMovies.length > 0) {
      console.log(`\n⚠️  ${orphanedMovies.length} movies would be deleted (no remaining performances):`);
      orphanedMovies.forEach((movie, i) => {
        console.log(`   ${i + 1}. "${movie.title}" (${movie.year})`);
      });
    } else {
      console.log('\n✅ No movies would be orphaned (all have other performances)');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n📝 NEXT STEPS:');
    console.log('   To actually delete these joke performances, run:');
    console.log('   npm run cleanup-joke-performances');
    console.log('   or');
    console.log('   ts-node scripts/cleanup-joke-performances.ts\n');

  } catch (error) {
    console.error('❌ Error during scan:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the listing
listJokePerformances()
  .then(() => {
    console.log('\n✅ Scan completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

