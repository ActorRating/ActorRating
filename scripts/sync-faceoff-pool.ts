import { prisma } from "../src/lib/prisma"
import { syncFaceOffPool } from "../src/lib/faceoff/sync-pool"

async function main() {
  const result = await syncFaceOffPool()
  console.log(`Face-Off pool ready: ${result.actors} actors, ${result.performances} performances`)
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : "Face-Off sync failed")
  await prisma.$disconnect()
  process.exit(1)
})
