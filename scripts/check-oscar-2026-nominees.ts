import { prisma } from "../src/lib/prisma"

// Oscar 2026 Nominees (announced January 2026)
const OSCAR_2026_NOMINEES = [
  // Best Actor
  { actor: "Timothée Chalamet", movie: "Marty Supreme", category: "Best Actor" },
  { actor: "Leonardo DiCaprio", movie: "One Battle After Another", category: "Best Actor" },
  { actor: "Ethan Hawke", movie: "Blue Moon", category: "Best Actor" },
  { actor: "Michael B. Jordan", movie: "Sinners", category: "Best Actor" },
  { actor: "Wagner Moura", movie: "The Secret Agent", category: "Best Actor" },
  
  // Best Actress
  { actor: "Jessie Buckley", movie: "Hamnet", category: "Best Actress" },
  { actor: "Rose Byrne", movie: "If I Had Legs I'd Kick You", category: "Best Actress" },
  { actor: "Kate Hudson", movie: "Song Sung Blue", category: "Best Actress" },
  { actor: "Renate Reinsve", movie: "Sentimental Value", category: "Best Actress" },
  { actor: "Emma Stone", movie: "Bugonia", category: "Best Actress" },
  
  // Best Supporting Actor
  { actor: "Benicio del Toro", movie: "One Battle After Another", category: "Best Supporting Actor" },
  { actor: "Jacob Elordi", movie: "Frankenstein", category: "Best Supporting Actor" },
  { actor: "Delroy Lindo", movie: "Sinners", category: "Best Supporting Actor" },
  { actor: "Sean Penn", movie: "One Battle After Another", category: "Best Supporting Actor" },
  { actor: "Stellan Skarsgård", movie: "Sentimental Value", category: "Best Supporting Actor" },
  
  // Best Supporting Actress
  { actor: "Elle Fanning", movie: "Sentimental Value", category: "Best Supporting Actress" },
  { actor: "Inga Ibsdotter Lilleaas", movie: "Sentimental Value", category: "Best Supporting Actress" },
  { actor: "Amy Madigan", movie: "Weapons", category: "Best Supporting Actress" },
  { actor: "Wunmi Mosaku", movie: "Sinners", category: "Best Supporting Actress" },
  { actor: "Teyana Taylor", movie: "One Battle After Another", category: "Best Supporting Actress" },
]

async function checkOscar2026Nominees() {
  console.log("=".repeat(80))
  console.log("CHECKING OSCAR 2026 NOMINEES")
  console.log("=".repeat(80))
  
  const results = {
    found: [] as Array<{ actor: string; movie: string; category: string; year?: number }>,
    missingActor: [] as Array<{ actor: string; movie: string; category: string }>,
    missingMovie: [] as Array<{ actor: string; movie: string; category: string }>,
    missingPerformance: [] as Array<{ actor: string; movie: string; category: string; year?: number }>,
  }
  
  try {
    for (const nominee of OSCAR_2026_NOMINEES) {
      // First find the actor
      const actor = await prisma.actor.findFirst({
        where: { name: nominee.actor }
      })
      
      // Then find the movie
      const movie = await prisma.movie.findFirst({
        where: { title: nominee.movie }
      })
      
      if (!actor) {
        results.missingActor.push(nominee)
        console.log(`✗ [${nominee.category}] ${nominee.actor} in "${nominee.movie}": ACTOR NOT FOUND`)
        continue
      }
      
      if (!movie) {
        results.missingMovie.push(nominee)
        console.log(`✗ [${nominee.category}] ${nominee.actor} in "${nominee.movie}": MOVIE NOT FOUND`)
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
        results.found.push({ ...nominee, year: movie.year })
        console.log(`✓ [${nominee.category}] ${nominee.actor} in "${nominee.movie}" (${movie.year}): FOUND`)
      } else {
        results.missingPerformance.push({ ...nominee, year: movie.year })
        console.log(`✗ [${nominee.category}] ${nominee.actor} in "${nominee.movie}" (${movie.year}): PERFORMANCE NOT FOUND (actor & movie exist)`)
      }
    }
    
    console.log("\n" + "=".repeat(80))
    console.log("SUMMARY")
    console.log("=".repeat(80))
    console.log(`\n✓ Found: ${results.found.length}/${OSCAR_2026_NOMINEES.length}`)
    console.log(`✗ Missing Actor: ${results.missingActor.length}`)
    console.log(`✗ Missing Movie: ${results.missingMovie.length}`)
    console.log(`✗ Missing Performance: ${results.missingPerformance.length}`)
    
    if (results.missingActor.length > 0) {
      console.log("\n" + "-".repeat(80))
      console.log("MISSING ACTORS:")
      console.log("-".repeat(80))
      results.missingActor.forEach(n => {
        console.log(`  • ${n.actor} (needed for "${n.movie}" - ${n.category})`)
      })
    }
    
    if (results.missingMovie.length > 0) {
      console.log("\n" + "-".repeat(80))
      console.log("MISSING MOVIES:")
      console.log("-".repeat(80))
      results.missingMovie.forEach(n => {
        console.log(`  • "${n.movie}" (${n.actor} - ${n.category})`)
      })
    }
    
    if (results.missingPerformance.length > 0) {
      console.log("\n" + "-".repeat(80))
      console.log("MISSING PERFORMANCES (Actor & Movie exist, but no performance link):")
      console.log("-".repeat(80))
      results.missingPerformance.forEach(n => {
        console.log(`  • ${n.actor} in "${n.movie}" (${n.year}) - ${n.category}`)
      })
    }
    
    if (results.found.length > 0) {
      console.log("\n" + "-".repeat(80))
      console.log("FOUND PERFORMANCES:")
      console.log("-".repeat(80))
      results.found.forEach(n => {
        console.log(`  ✓ ${n.actor} in "${n.movie}" (${n.year}) - ${n.category}`)
      })
    }
    
    console.log("\n" + "=".repeat(80))
    console.log("NOTE: Missing performances need to be added to the database.")
    console.log("The Oscar 2026 page will show 'Rate First' for missing performances.")
    console.log("=".repeat(80))
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

checkOscar2026Nominees()
