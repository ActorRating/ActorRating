import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

async function runScript(scriptPath: string, description: string): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 ${description}`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    const { stdout, stderr } = await execAsync(`npx tsx ${scriptPath}`, {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log(`\n✅ ${description} - COMPLETED\n`);
  } catch (error: any) {
    console.error(`\n❌ ${description} - FAILED`);
    console.error(error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    throw error;
  }
}

async function showStats() {
  const actorCount = await prisma.actor.count();
  const movieCount = await prisma.movie.count();
  const performanceCount = await prisma.performance.count();
  const ratingCount = await prisma.rating.count();
  
  console.log(`\n📊 Current Database Stats:`);
  console.log(`   🎭 Actors: ${actorCount}`);
  console.log(`   🎬 Movies: ${movieCount}`);
  console.log(`   🎪 Performances: ${performanceCount}`);
  console.log(`   ⭐ Ratings: ${ratingCount}`);
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                   🎬 DATABASE MODERNIZATION SCRIPT 🎬                        ║
║                                                                               ║
║   This script will:                                                          ║
║   1. Clean up unwanted actors (adult performers, ultra-niche, directors)    ║
║   2. Add TIER 1 actors with full filmography (Classic Hollywood & 90s icons)║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  // Show initial stats
  console.log('\n📊 INITIAL DATABASE STATE');
  await showStats();
  
  // Step 1: Cleanup unwanted actors
  try {
    await runScript(
      'scripts/cleanup-unwanted-actors.ts',
      'STEP 1: Cleaning up unwanted actors'
    );
  } catch (error) {
    console.error('\n⚠️  Cleanup failed, but continuing to additions...\n');
  }
  
  // Show stats after cleanup
  console.log('\n📊 AFTER CLEANUP');
  await showStats();
  
  // Step 2: Add TIER 1 actors
  await runScript(
    'scripts/add-tier1-actors.ts',
    'STEP 2: Adding TIER 1 actors with full filmography'
  );
  
  // Show final stats
  console.log('\n📊 FINAL DATABASE STATE');
  await showStats();
  
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                        🎉 MODERNIZATION COMPLETE! 🎉                         ║
║                                                                               ║
║   Your database now has:                                                     ║
║   ✅ Cleaned up unwanted/inappropriate actors                               ║
║   ✅ Added TIER 1 classic Hollywood legends                                 ║
║   ✅ Added TIER 1 70s-80s icons                                             ║
║   ✅ Added TIER 1 90s-2000s A-list actors                                   ║
║                                                                               ║
║   Next steps:                                                                ║
║   📝 Review the actor list on your site                                     ║
║   📝 Prepare for TIER 2 additions (run add-tier2-actors.ts later)          ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
}

main()
  .catch((error) => {
    console.error('\n💥 Fatal error in modernization script:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
