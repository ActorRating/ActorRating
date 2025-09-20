import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testSearch() {
  try {
    console.log('Testing search functionality...\n')
    
    // Find Christian Bale exactly
    const christianBale = await prisma.actor.findFirst({
      where: {
        name: 'Christian Bale'
      }
    })
    
    if (christianBale) {
      console.log('✅ Christian Bale found in database:')
      console.log(`   ID: ${christianBale.id}`)
      console.log(`   Name: "${christianBale.name}"`)
      console.log(`   Length: ${christianBale.name.length}`)
      
      // Test different search terms
      const searchTerms = ['christian', 'bale', 'christian bale', 'Christian', 'Bale', 'Christian Bale']
      
      for (const term of searchTerms) {
        console.log(`\n🔍 Testing search for: "${term}"`)
        
        // Test full-text search
        const fullTextResults = await prisma.$queryRaw`
          SELECT id, name
          FROM "Actor"
          WHERE to_tsvector('english', name) @@ plainto_tsquery('english', ${term})
        `
        console.log(`   Full-text results: ${(fullTextResults as any[]).length}`)
        
        // Test trigram similarity
        const trigramResults = await prisma.$queryRaw`
          SELECT id, name, similarity(name, ${term}) as sim
          FROM "Actor"
          WHERE similarity(name, ${term}) > 0.2
          ORDER BY sim DESC
          LIMIT 5
        `
        console.log(`   Trigram results: ${(trigramResults as any[]).length}`)
        if ((trigramResults as any[]).length > 0) {
          console.log(`   Best match: ${(trigramResults as any[])[0].name} (similarity: ${(trigramResults as any[])[0].sim})`)
        }
        
        // Test ILIKE
        const ilikeResults = await prisma.$queryRaw`
          SELECT id, name
          FROM "Actor"
          WHERE name ILIKE ${`%${term}%`}
          LIMIT 5
        `
        console.log(`   ILIKE results: ${(ilikeResults as any[]).length}`)
        if ((ilikeResults as any[]).length > 0) {
          console.log(`   First match: ${(ilikeResults as any[])[0].name}`)
        }
      }
      
    } else {
      console.log('❌ Christian Bale not found with exact match')
      
      // Search for similar names
      const similarActors = await prisma.actor.findMany({
        where: {
          name: {
            contains: 'Christian',
            mode: 'insensitive'
          }
        },
        take: 10
      })
      
      console.log('\nActors with "Christian" in name:')
      similarActors.forEach(actor => {
        console.log(`   - ${actor.name}`)
      })
    }
    
  } catch (error) {
    console.error('Error testing search:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSearch() 