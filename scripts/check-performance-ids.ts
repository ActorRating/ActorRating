import { prisma } from "../src/lib/prisma"

async function checkPerformanceIds() {
  console.log("=".repeat(80))
  console.log("CHECKING PREDEFINED PERFORMANCE IDS")
  console.log("=".repeat(80))
  
  const RECENT_PERFORMANCE_IDS = [
    "cmgmfb0um0a86ket8hr0ipcap",
    "cmgmfb0tx0a7uket8qnkxrpor",
    "cmgmfb0ss0a7kket8lhd8hfiz",
    "cmgmfb0rq0a7aket819zfqpyi",
    "cmgmfb0qo0a70ket8ozvtgqec",
    "cmgmfb0pk0a6qket8ub8ayjg7"
  ]

  const ICONIC_PERFORMANCE_IDS = [
    "cmgmfb0oi0a6gket89agd74vy",
    "cmgmfb0ng0a66ket8nccfetsp",
    "cmgmfb0mf0a5wket8xh9oaofo",
    "cmgmfb0le0a5mket85koyh8pl",
    "cmgmfb0kd0a5cket8s5ydtfvd",
    "cmgmfb0jc0a52ket8s38jq8f1"
  ]
  
  try {
    console.log("\nChecking RECENT performances:")
    for (const id of RECENT_PERFORMANCE_IDS) {
      const perf = await prisma.performance.findUnique({
        where: { id },
        include: {
          actor: { select: { name: true } },
          movie: { select: { title: true, year: true } }
        }
      })
      
      if (perf) {
        console.log(`✓ ${id}: ${perf.actor.name} in ${perf.movie.title} (${perf.movie.year})`)
      } else {
        console.log(`✗ ${id}: NOT FOUND`)
      }
    }
    
    console.log("\nChecking ICONIC performances:")
    for (const id of ICONIC_PERFORMANCE_IDS) {
      const perf = await prisma.performance.findUnique({
        where: { id },
        include: {
          actor: { select: { name: true } },
          movie: { select: { title: true, year: true } }
        }
      })
      
      if (perf) {
        console.log(`✓ ${id}: ${perf.actor.name} in ${perf.movie.title} (${perf.movie.year})`)
      } else {
        console.log(`✗ ${id}: NOT FOUND`)
      }
    }
    
    // If IDs don't exist, get some sample IDs
    console.log("\n" + "=".repeat(80))
    console.log("SAMPLE PERFORMANCE IDS FROM DATABASE (if needed):")
    console.log("=".repeat(80))
    
    const samplePerfs = await prisma.performance.findMany({
      take: 12,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { name: true } },
        movie: { select: { title: true, year: true } }
      }
    })
    
    console.log("\nRecent performances (use these if IDs above don't exist):")
    samplePerfs.slice(0, 6).forEach((p, i) => {
      console.log(`  "${p.id}", // ${p.actor.name} in ${p.movie.title}`)
    })
    
    console.log("\nIconic performances (use these if IDs above don't exist):")
    samplePerfs.slice(6, 12).forEach((p, i) => {
      console.log(`  "${p.id}", // ${p.actor.name} in ${p.movie.title}`)
    })
    
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPerformanceIds()



