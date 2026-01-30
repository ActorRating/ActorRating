/**
 * Count movies and actors that have 0 performances (user ratings).
 * These are excluded from sitemaps so only pages with at least one rateable performance are indexed.
 *
 * Run: npx ts-node scripts/count-zero-performance-pages.ts
 * Or: npx tsx scripts/count-zero-performance-pages.ts
 */
import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('Counting movies and actors with 0 performances...\n')

  const [moviesWithZero, actorsWithZero, totalMovies, totalActors] = await Promise.all([
    prisma.movie.count({ where: { performances: { none: {} } } }),
    prisma.actor.count({ where: { performances: { none: {} } } }),
    prisma.movie.count(),
    prisma.actor.count(),
  ])

  const moviesWithAtLeastOne = totalMovies - moviesWithZero
  const actorsWithAtLeastOne = totalActors - actorsWithZero

  console.log('Movies:')
  console.log(`  Total: ${totalMovies}`)
  console.log(`  With 0 performances (excluded from sitemap): ${moviesWithZero}`)
  console.log(`  With ≥1 performance (in sitemap): ${moviesWithAtLeastOne}`)
  console.log('')
  console.log('Actors:')
  console.log(`  Total: ${totalActors}`)
  console.log(`  With 0 performances (excluded from sitemap): ${actorsWithZero}`)
  console.log(`  With ≥1 performance (in sitemap): ${actorsWithAtLeastOne}`)
  console.log('')
  console.log('Sitemap includes only actors and movies with at least one performance.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
