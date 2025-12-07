import { prisma } from "../src/lib/prisma"

async function checkPerformanceTargets() {
  console.log("=".repeat(80))
  console.log("CHECKING PERFORMANCE LOOKUPS")
  console.log("=".repeat(80))
  
  const RECENT_PERFORMANCE_TARGETS = [
    { actor: "Timothée Chalamet", movie: "Dune: Part Two" },
    { actor: "Zendaya", movie: "Challengers" },
    { actor: "Cillian Murphy", movie: "Oppenheimer" },
    { actor: "Emma Stone", movie: "Poor Things" },
    { actor: "Austin Butler", movie: "Elvis" },
    { actor: "Margot Robbie", movie: "Barbie" }
  ]

  const ICONIC_PERFORMANCE_TARGETS = [
    { actor: "Heath Ledger", movie: "The Dark Knight" },
    { actor: "Al Pacino", movie: "The Godfather Part II" },
    { actor: "Marlon Brando", movie: "The Godfather" },
    { actor: "Leonardo DiCaprio", movie: "The Wolf of Wall Street" },
    { actor: "Robert De Niro", movie: "Taxi Driver" },
    { actor: "Anthony Hopkins", movie: "The Silence of the Lambs" }
  ]
  
  try {
    console.log("\nChecking RECENT performances:")
    for (const target of RECENT_PERFORMANCE_TARGETS) {
      // First find the actor
      const actor = await prisma.actor.findFirst({
        where: { name: target.actor }
      })
      
      // Then find the movie
      const movie = await prisma.movie.findFirst({
        where: { title: target.movie }
      })
      
      if (!actor) {
        console.log(`✗ ${target.actor} in ${target.movie}: Actor not found`)
        continue
      }
      
      if (!movie) {
        console.log(`✗ ${target.actor} in ${target.movie}: Movie not found`)
        continue
      }
      
      // Now find the performance
      const perf = await prisma.performance.findFirst({
        where: {
          actorId: actor.id,
          movieId: movie.id
        }
      })
      
      if (perf) {
        console.log(`✓ ${target.actor} in ${target.movie} (${movie.year}): Found`)
      } else {
        console.log(`✗ ${target.actor} in ${target.movie}: Performance link not found (but both actor and movie exist)`)
      }
    }
    
    console.log("\nChecking ICONIC performances:")
    for (const target of ICONIC_PERFORMANCE_TARGETS) {
      // First find the actor
      const actor = await prisma.actor.findFirst({
        where: { name: target.actor }
      })
      
      // Then find the movie
      const movie = await prisma.movie.findFirst({
        where: { title: target.movie }
      })
      
      if (!actor) {
        console.log(`✗ ${target.actor} in ${target.movie}: Actor not found`)
        continue
      }
      
      if (!movie) {
        console.log(`✗ ${target.actor} in ${target.movie}: Movie not found`)
        continue
      }
      
      // Now find the performance
      const perf = await prisma.performance.findFirst({
        where: {
          actorId: actor.id,
          movieId: movie.id
        }
      })
      
      if (perf) {
        console.log(`✓ ${target.actor} in ${target.movie} (${movie.year}): Found`)
      } else {
        console.log(`✗ ${target.actor} in ${target.movie}: Performance link not found (but both actor and movie exist)`)
      }
    }
    
    console.log("\n" + "=".repeat(80))
    console.log("SUMMARY")
    console.log("=".repeat(80))
    console.log("Note: If performances are NOT FOUND, they need to be added to the database.")
    console.log("The page will skip missing performances and show only those that exist.")
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPerformanceTargets()
