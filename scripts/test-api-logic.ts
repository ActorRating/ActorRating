import { prisma } from "../src/lib/prisma"

async function testApiLogic() {
  const targets = [
    { actor: "Timothée Chalamet", movie: "Dune: Part Two" },
    { actor: "Zendaya", movie: "Challengers" },
  ]
  
  console.log("Testing API logic...")
  
  try {
    const allPerformances = []
    
    for (const target of targets) {
      console.log(`\nLooking up: ${target.actor} - ${target.movie}`)
      
      // First find actor
      const actor = await prisma.actor.findFirst({
        where: { name: target.actor }
      })
      
      if (!actor) {
        console.log(`  Actor not found: ${target.actor}`)
        continue
      }
      console.log(`  ✓ Actor found: ${actor.name} (ID: ${actor.id})`)
      
      // Then find movie
      const movie = await prisma.movie.findFirst({
        where: { title: target.movie }
      })
      
      if (!movie) {
        console.log(`  Movie not found: ${target.movie}`)
        continue
      }
      console.log(`  ✓ Movie found: ${movie.title} (ID: ${movie.id})`)
      
      // Now find the performance
      const performance = await prisma.performance.findFirst({
        where: {
          actorId: actor.id,
          movieId: movie.id
        },
        include: {
          actor: {
            select: { id: true, name: true, imageUrl: true }
          },
          movie: {
            select: { id: true, title: true, year: true, director: true }
          }
        }
      })
      
      if (performance) {
        allPerformances.push(performance)
        console.log(`  ✓ Performance found: ID ${performance.id}`)
        console.log(`    Character: ${performance.character || 'N/A'}`)
      } else {
        console.log(`  ✗ Performance not found`)
      }
    }
    
    console.log(`\n✅ Total performances found: ${allPerformances.length}`)
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

testApiLogic()



