#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

async function resetDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🗑️  Starting database reset...');
    console.log('This will clear Actor, Movie, and Performance tables.');
    console.log('Other tables (RateLimit, Rating, ShareImage, etc.) will remain intact.\n');
    
    // Get current counts before deletion
    const actorCount = await prisma.actor.count();
    const movieCount = await prisma.movie.count();
    const performanceCount = await prisma.performance.count();
    
    console.log(`📊 Current data:`);
    console.log(`   - Actors: ${actorCount}`);
    console.log(`   - Movies: ${movieCount}`);
    console.log(`   - Performances: ${performanceCount}\n`);
    
    console.log('🔄 Clearing tables...');
    
    // Delete in the correct order to respect foreign key constraints
    // First delete performances (they reference actors and movies)
    console.log('   - Deleting performances...');
    const deletedPerformances = await prisma.performance.deleteMany();
    console.log(`     ✅ Deleted ${deletedPerformances.count} performances`);
    
    // Then delete actors (they may be referenced by ratings)
    console.log('   - Deleting actors...');
    const deletedActors = await prisma.actor.deleteMany();
    console.log(`     ✅ Deleted ${deletedActors.count} actors`);
    
    // Finally delete movies (they may be referenced by ratings)
    console.log('   - Deleting movies...');
    const deletedMovies = await prisma.movie.deleteMany();
    console.log(`     ✅ Deleted ${deletedMovies.count} movies`);
    
    console.log('\n✅ Database cleared successfully!');
    console.log('\n📊 Summary of deletions:');
    console.log(`   - Actors: ${deletedActors.count}`);
    console.log(`   - Movies: ${deletedMovies.count}`);
    console.log(`   - Performances: ${deletedPerformances.count}`);
    console.log('\n🎯 Ready for fresh data! You can now add the top 300 actors from TMDb.');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    console.error('\nThis might be due to:');
    console.error('  - Foreign key constraints');
    console.error('  - Database connection issues');
    console.error('  - Permission problems');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetDatabase();
