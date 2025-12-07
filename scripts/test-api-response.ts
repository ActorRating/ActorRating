// Test what the API actually returns
async function testApiResponse() {
  console.log("Testing API response format...")
  
  try {
    // Simulate the API call without section parameter
    const response = await fetch('http://localhost:3000/api/performances')
    
    if (!response.ok) {
      console.error(`API returned status: ${response.status}`)
      return
    }
    
    const data = await response.json()
    console.log("\nAPI Response Type:", Array.isArray(data) ? "Array" : typeof data)
    console.log("API Response Keys:", Object.keys(data))
    console.log("\nFull Response:")
    console.log(JSON.stringify(data, null, 2))
    
    // Test what frontend filtering does
    const validData = Array.isArray(data) 
      ? data.filter((p: any) => 
          p.actorId && 
          p.movieId && 
          p.actor?.id && 
          p.movie?.id &&
          p.actor?.name &&
          p.movie?.title
        )
      : []
    
    console.log("\nFrontend filtered result length:", validData.length)
    console.log("This is why UI shows 'No recent performances found'!")
    
  } catch (error) {
    console.error("Error:", error)
    console.log("\n⚠️  Server might not be running. Starting server test...")
    
    // Test the API logic directly
    const { prisma } = await import("../src/lib/prisma")
    
    const raw = await prisma.performance.findMany({
      include: {
        actor: { select: { id: true, name: true, imageUrl: true } },
        movie: { select: { id: true, title: true, year: true, director: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    
    const valid = raw.filter((p) => p.actor && p.movie)
    console.log(`\nDirect query: ${valid.length} valid performances`)
    
    // Simulate what API returns when no section param
    const newList: any[] = []
    const seenNew = new Set<string>()
    for (const p of valid.slice(0, 10)) {
      const a = String(p.actorId)
      if (!seenNew.has(a)) {
        seenNew.add(a)
        newList.push({
          id: p.id,
          actorId: p.actorId,
          movieId: p.movieId,
          actor: p.actor,
          movie: p.movie,
        })
      }
      if (newList.length >= 6) break
    }
    
    const resBody = { new: newList, iconic: [] }
    console.log("\nAPI would return:", JSON.stringify(resBody, null, 2))
    console.log("\nIs it an array?", Array.isArray(resBody))
    console.log("Frontend would get:", Array.isArray(resBody) ? resBody.length : 0, "items")
    
    await prisma.$disconnect()
  }
}

testApiResponse()



