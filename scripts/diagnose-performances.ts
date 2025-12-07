import { prisma } from "../src/lib/prisma"

async function diagnose() {
  console.log("=".repeat(80))
  console.log("PERFORMANCES PAGE DIAGNOSTIC")
  console.log("=".repeat(80))
  
  try {
    // 1. Check Performance (capital P) model count
    console.log("\n1. Checking 'Performance' model (capital P)...")
    const performanceCount = await prisma.performance.count()
    console.log(`   PERFORMANCE COUNT: ${performanceCount}`)
    
    // 2. Check performances (lowercase p) model count
    console.log("\n2. Checking 'performances' model (lowercase p)...")
    const performancesCount = await prisma.performances.count()
    console.log(`   performances COUNT: ${performancesCount}`)
    
    // 3. Sample from Performance model
    console.log("\n3. Sample from 'Performance' model (what API is querying)...")
    const performanceSample = await prisma.performance.findMany({
      take: 5,
      include: { 
        actor: { select: { id: true, name: true, imageUrl: true } },
        movie: { select: { id: true, title: true, year: true, director: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    console.log(`   Found ${performanceSample.length} records`)
    if (performanceSample.length > 0) {
      console.log("   Sample record:")
      console.log(JSON.stringify(performanceSample[0], null, 2))
    } else {
      console.log("   ⚠️  NO RECORDS FOUND in Performance model!")
    }
    
    // 4. Check for null relations in Performance
    console.log("\n4. Checking for null actor/movie relations in Performance...")
    const allPerformances = await prisma.performance.findMany({
      take: 100,
      include: { actor: true, movie: true }
    })
    const withNullActor = allPerformances.filter(p => !p.actor)
    const withNullMovie = allPerformances.filter(p => !p.movie)
    console.log(`   Total checked: ${allPerformances.length}`)
    console.log(`   With null actor: ${withNullActor.length}`)
    console.log(`   With null movie: ${withNullMovie.length}`)
    
    // 5. Sample from performances model (lowercase)
    console.log("\n5. Sample from 'performances' model (lowercase - filmography data)...")
    const performancesSample = await prisma.performances.findMany({
      take: 5,
      include: { actors: true }
    })
    console.log(`   Found ${performancesSample.length} records`)
    if (performancesSample.length > 0) {
      console.log("   Sample record:")
      console.log(JSON.stringify(performancesSample[0], null, 2))
    }
    
    // 6. Check Actor and Movie counts
    console.log("\n6. Checking Actor and Movie model counts...")
    const actorCount = await prisma.actor.count()
    const movieCount = await prisma.movie.count()
    console.log(`   Actor count: ${actorCount}`)
    console.log(`   Movie count: ${movieCount}`)
    
    // 7. Test the exact query the API uses
    console.log("\n7. Testing exact API query...")
    const apiQuery = await prisma.performance.findMany({
      include: {
        actor: { select: { id: true, name: true, imageUrl: true } },
        movie: { select: { id: true, title: true, year: true, director: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    console.log(`   API query returned: ${apiQuery.length} records`)
    const valid = apiQuery.filter((p) => p.actor && p.movie)
    console.log(`   Valid (with actor AND movie): ${valid.length} records`)
    
    if (valid.length === 0 && apiQuery.length > 0) {
      console.log("\n   ⚠️  PROBLEM: Records exist but have null relations!")
      console.log("   First invalid record:")
      const invalid = apiQuery.find(p => !p.actor || !p.movie)
      if (invalid) {
        console.log(JSON.stringify({
          id: invalid.id,
          actorId: invalid.actorId,
          movieId: invalid.movieId,
          hasActor: !!invalid.actor,
          hasMovie: !!invalid.movie
        }, null, 2))
      }
    }
    
    // 8. Check DATABASE_URL
    console.log("\n8. Database connection info...")
    const dbUrl = process.env.DATABASE_URL
    if (dbUrl) {
      const masked = dbUrl.replace(/:[^:@]+@/, ':****@')
      console.log(`   DATABASE_URL: ${masked.substring(0, 50)}...`)
    } else {
      console.log("   ⚠️  DATABASE_URL not set!")
    }
    
    console.log("\n" + "=".repeat(80))
    console.log("DIAGNOSTIC COMPLETE")
    console.log("=".repeat(80))
    
  } catch (error) {
    console.error("\n❌ ERROR:", error)
    if (error instanceof Error) {
      console.error("   Message:", error.message)
      console.error("   Stack:", error.stack)
    }
  } finally {
    await prisma.$disconnect()
  }
}

diagnose()



