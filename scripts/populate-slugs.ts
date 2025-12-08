/**
 * Script to populate slug fields for existing actors and movies
 * This is a one-time migration that adds slugs to all existing records
 * 
 * Run with: npx tsx scripts/populate-slugs.ts
 */

import { PrismaClient } from '@prisma/client'
import { createActorSlug, createMovieSlug } from '../src/lib/createSlug'

const prisma = new PrismaClient()

async function populateSlugs() {
  console.log('🔄 Starting slug population...\n')

  try {
    // Populate Actor slugs
    console.log('📝 Populating actor slugs...')
    const actors = await prisma.actor.findMany({
      where: {
        OR: [
          { slug: null },
          { slug: '' }
        ]
      },
      select: { id: true, name: true, slug: true }
    })

    console.log(`Found ${actors.length} actors without slugs`)

    let actorCount = 0
    for (const actor of actors) {
      const slug = createActorSlug(actor.name)
      
      // Check if slug already exists (handle duplicates)
      const existing = await prisma.actor.findUnique({
        where: { slug }
      })

      let finalSlug = slug
      if (existing && existing.id !== actor.id) {
        // Append ID to make unique
        finalSlug = `${slug}-${actor.id.slice(-8)}`
        console.log(`  ⚠️  Duplicate slug "${slug}" found, using "${finalSlug}"`)
      }

      await prisma.actor.update({
        where: { id: actor.id },
        data: { slug: finalSlug }
      })

      actorCount++
      if (actorCount % 10 === 0) {
        process.stdout.write(`  ✓ Updated ${actorCount}/${actors.length} actors\r`)
      }
    }
    console.log(`  ✅ Updated ${actorCount} actor slugs\n`)

    // Populate Movie slugs
    console.log('📝 Populating movie slugs...')
    const movies = await prisma.movie.findMany({
      where: {
        OR: [
          { slug: null },
          { slug: '' }
        ]
      },
      select: { id: true, title: true, year: true, slug: true }
    })

    console.log(`Found ${movies.length} movies without slugs`)

    let movieCount = 0
    const BATCH_SIZE = 50 // Process in smaller batches to avoid timeouts
    
    for (let i = 0; i < movies.length; i += BATCH_SIZE) {
      const batch = movies.slice(i, i + BATCH_SIZE)
      
      // Process batch with Promise.all for better performance
      await Promise.all(
        batch.map(async (movie) => {
          try {
            const slug = createMovieSlug(movie.title, movie.year)
            
            // Check if slug already exists (handle duplicates)
            const existing = await prisma.movie.findUnique({
              where: { slug }
            })

            let finalSlug = slug
            if (existing && existing.id !== movie.id) {
              // Append ID to make unique
              finalSlug = `${slug}-${movie.id.slice(-8)}`
            }

            await prisma.movie.update({
              where: { id: movie.id },
              data: { slug: finalSlug }
            })

            movieCount++
          } catch (error) {
            console.error(`  ❌ Error updating movie ${movie.id}:`, error)
            // Continue with next movie
          }
        })
      )
      
      // Progress update after each batch
      process.stdout.write(`  ✓ Updated ${movieCount}/${movies.length} movies\r`)
      
      // Small delay between batches to avoid overwhelming the connection
      if (i + BATCH_SIZE < movies.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    console.log(`  ✅ Updated ${movieCount} movie slugs\n`)

    console.log('✅ Slug population completed successfully!')
    console.log(`   - ${actorCount} actors updated`)
    console.log(`   - ${movieCount} movies updated`)

  } catch (error) {
    console.error('❌ Error populating slugs:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
populateSlugs()
  .then(() => {
    console.log('\n✨ All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })

