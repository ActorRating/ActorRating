import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkTimothee() {
  try {
    console.log('Checking for Timothée Chalamet...\n')
    
    // Search for variations of Timothée
    const searchTerms = ['timothee', 'timothée', 'chalamet', 'timothee chalamet', 'timothée chalamet']
    
    for (const term of searchTerms) {
      console.log(`🔍 Searching for: "${term}"`)
      
      // Check exact matches
      const exactMatches = await prisma.actor.findMany({
        where: {
          name: {
            contains: term,
            mode: 'insensitive'
          }
        },
        take: 5
      })
      
      console.log(`   Exact matches: ${exactMatches.length}`)
      exactMatches.forEach(actor => {
        console.log(`   - ${actor.name}`)
      })
      
      // Check trigram similarity
      const trigramMatches = await prisma.$queryRaw`
        SELECT name, similarity(name, ${term}) as sim
        FROM "Actor"
        WHERE similarity(name, ${term}) > 0.2
        ORDER BY sim DESC
        LIMIT 5
      `
      console.log(`   Trigram matches: ${trigramMatches.length}`)
      trigramMatches.forEach((match: any) => {
        console.log(`   - ${match.name} (similarity: ${match.sim})`)
      })
      
      console.log('')
    }
    
    // Check for actors with "Timothée" in their name
    console.log('Actors with "Timothée" in name:')
    const timotheeActors = await prisma.actor.findMany({
      where: {
        name: {
          contains: 'Timothée',
          mode: 'insensitive'
        }
      }
    })
    
    timotheeActors.forEach(actor => {
      console.log(`   - ${actor.name} (ID: ${actor.id})`)
    })
    
    // Check for actors with "Chalamet" in their name
    console.log('\nActors with "Chalamet" in name:')
    const chalametActors = await prisma.actor.findMany({
      where: {
        name: {
          contains: 'Chalamet',
          mode: 'insensitive'
        }
      }
    })
    
    chalametActors.forEach(actor => {
      console.log(`   - ${actor.name} (ID: ${actor.id})`)
    })
    
  } catch (error) {
    console.error('Error checking Timothée:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTimothee() 