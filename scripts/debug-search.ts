import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugSearch() {
  try {
    console.log('Debugging search for "bale"...\n')
    
    const searchTerm = 'bale'
    
    // Test the exact query from our API
    console.log('1. Full-text search results:')
    const fullTextResults = await prisma.$queryRaw`
      SELECT id, name
      FROM "Actor"
      WHERE to_tsvector('english', name) @@ plainto_tsquery('english', ${searchTerm})
    `
    console.log(`   Found ${fullTextResults.length} results`)
    fullTextResults.forEach((result: any) => {
      console.log(`   - ${result.name}`)
    })
    
    console.log('\n2. Trigram similarity results (excluding full-text matches):')
    const trigramResults = await prisma.$queryRaw`
      SELECT id, name, similarity(name, ${searchTerm}) as sim
      FROM "Actor"
      WHERE similarity(name, ${searchTerm}) > 0.2
        AND id NOT IN (
          SELECT id FROM "Actor" 
          WHERE to_tsvector('english', name) @@ plainto_tsquery('english', ${searchTerm})
        )
      ORDER BY sim DESC
      LIMIT 10
    `
    console.log(`   Found ${trigramResults.length} results`)
    trigramResults.forEach((result: any) => {
      console.log(`   - ${result.name} (similarity: ${result.sim})`)
    })
    
    console.log('\n3. ILIKE results (excluding previous matches):')
    const ilikeResults = await prisma.$queryRaw`
      SELECT id, name
      FROM "Actor"
      WHERE name ILIKE ${`%${searchTerm}%`}
        AND id NOT IN (
          SELECT id FROM "Actor" 
          WHERE to_tsvector('english', name) @@ plainto_tsquery('english', ${searchTerm})
            OR similarity(name, ${searchTerm}) > 0.2
        )
      LIMIT 10
    `
    console.log(`   Found ${ilikeResults.length} results`)
    ilikeResults.forEach((result: any) => {
      console.log(`   - ${result.name}`)
    })
    
    // Check if Christian Bale is in any of these results
    console.log('\n4. Checking for Christian Bale specifically:')
    const christianBaleId = 'cmdr9ixq1004wke76bj8yy3vw'
    
    const inFullText = fullTextResults.some((r: any) => r.id === christianBaleId)
    const inTrigram = trigramResults.some((r: any) => r.id === christianBaleId)
    const inIlike = ilikeResults.some((r: any) => r.id === christianBaleId)
    
    console.log(`   In full-text results: ${inFullText}`)
    console.log(`   In trigram results: ${inTrigram}`)
    console.log(`   In ILIKE results: ${inIlike}`)
    
    // Test the combined query
    console.log('\n5. Combined query results (as in API):')
    const combinedResults = await prisma.$queryRaw`
      SELECT id, name
      FROM "Actor"
      WHERE to_tsvector('english', name) @@ plainto_tsquery('english', ${searchTerm})
      UNION
      SELECT id, name
      FROM "Actor"
      WHERE similarity(name, ${searchTerm}) > 0.2
        AND id NOT IN (
          SELECT id FROM "Actor" 
          WHERE to_tsvector('english', name) @@ plainto_tsquery('english', ${searchTerm})
        )
      UNION
      SELECT id, name
      FROM "Actor"
      WHERE name ILIKE ${`%${searchTerm}%`}
        AND id NOT IN (
          SELECT id FROM "Actor" 
          WHERE to_tsvector('english', name) @@ plainto_tsquery('english', ${searchTerm})
            OR similarity(name, ${searchTerm}) > 0.2
        )
      LIMIT 10
    `
    console.log(`   Found ${combinedResults.length} results`)
    combinedResults.forEach((result: any) => {
      console.log(`   - ${result.name}`)
    })
    
    const inCombined = combinedResults.some((r: any) => r.id === christianBaleId)
    console.log(`   Christian Bale in combined results: ${inCombined}`)
    
  } catch (error) {
    console.error('Error debugging search:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugSearch() 