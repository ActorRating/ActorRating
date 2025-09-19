import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkActors() {
  try {
    console.log('Checking actors in database...\n')
    
    // Get all actors
    const actors = await prisma.actor.findMany({
      select: {
        id: true,
        name: true,
        tmdbId: true,
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    console.log(`Total actors in database: ${actors.length}\n`)
    
    // Check for Christian Bale specifically
    const christianBale = await prisma.actor.findFirst({
      where: {
        name: {
          contains: 'Christian',
          mode: 'insensitive'
        }
      }
    })
    
    if (christianBale) {
      console.log('✅ Christian Bale found:')
      console.log(`   ID: ${christianBale.id}`)
      console.log(`   Name: ${christianBale.name}`)
      console.log(`   TMDB ID: ${christianBale.tmdbId}`)
    } else {
      console.log('❌ Christian Bale not found in database')
    }
    
    // Show first 10 actors
    console.log('\nFirst 10 actors in database:')
    actors.slice(0, 10).forEach((actor, index) => {
      console.log(`${index + 1}. ${actor.name} (ID: ${actor.id})`)
    })
    
    if (actors.length > 10) {
      console.log(`... and ${actors.length - 10} more actors`)
    }
    
  } catch (error) {
    console.error('Error checking actors:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkActors() 