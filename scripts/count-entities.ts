/**
 * Count: total actors, total movies, distinct actor-movie pairs.
 * Run: npx tsx scripts/count-entities.ts
 */
import { prisma } from '../src/lib/prisma'

async function main() {
  const [actorCount, movieCount, performanceRows, distinctPairsFromPerformance, distinctPairsFromRating] =
    await Promise.all([
      prisma.actor.count(),
      prisma.movie.count(),
      prisma.performance.count(),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT ("actorId" || '-' || "movieId"))::bigint AS count FROM "Performance"
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT ("actorId" || '-' || "movieId"))::bigint AS count FROM "Rating"
      `,
    ])

  const distinctPerformance = Number(distinctPairsFromPerformance[0]?.count ?? 0)
  const distinctRating = Number(distinctPairsFromRating[0]?.count ?? 0)

  console.log('Total actors in DB:        ', actorCount)
  console.log('Total movies in DB:        ', movieCount)
  console.log('Total Performance records: ', performanceRows)
  console.log('Distinct actor-movie pairs (Performance):', distinctPerformance)
  console.log('Distinct actor-movie pairs (Rating):      ', distinctRating)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
