/**
 * Count total indexed pages site-wide with current rules:
 * - Static: 6 (home, about, signin, signup, privacy, oscars-2026)
 * - Actor pages: actors with ≥1 rated performance OR ≥5 performances
 * - Movie pages: movies with ≥1 rated performance OR ≥5 total performances, excluding adult content
 * - Rate pages: distinct (actorId, movieId) pairs with ≥1 rating
 *
 * Run: npx tsx scripts/count-indexed-pages.ts
 */
import { prisma } from '../src/lib/prisma'
import { isAdultContentMovie } from '../src/lib/adult-content-filter'

const STATIC_PAGES = 6

async function main() {
  console.log('Counting indexed pages (sitemap + no noindex)...\n')

  // Actors: distinct actorId in Rating
  const actorIdsWithRatings = await prisma.rating.findMany({
    select: { actorId: true },
    distinct: ['actorId'],
  })
  const actorCount = actorIdsWithRatings.length

  // Movies: ≥1 rated performance OR ≥5 total performances (same as sitemap + layout)
  const [movieIdsWithRatings, movieIdsWithFivePlusPerformances] = await Promise.all([
    prisma.$queryRaw<Array<{ movieId: string }>>`
      SELECT "movieId"
      FROM "Rating"
      GROUP BY "movieId"
      HAVING COUNT(DISTINCT "actorId") >= 1
    `,
    prisma.$queryRaw<Array<{ movieId: string }>>`
      SELECT "movieId"
      FROM "Performance"
      GROUP BY "movieId"
      HAVING COUNT(*) >= 5
    `,
  ])
  const movieIdsSet = new Set([
    ...movieIdsWithRatings.map((r) => r.movieId),
    ...movieIdsWithFivePlusPerformances.map((r) => r.movieId),
  ])
  const movieIds = Array.from(movieIdsSet)
  const movies = await prisma.movie.findMany({
    where: { id: { in: movieIds } },
    select: { title: true, genre: true, overview: true },
  })
  const movieCount = movies.filter(
    (m) => !isAdultContentMovie({ title: m.title, genre: m.genre, overview: m.overview })
  ).length

  // Rate pages: distinct (actorId, movieId) in Rating
  const rateCountResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT ("actorId" || '-' || "movieId"))::bigint as count
    FROM "Rating"
  `
  const rateCount = Number(rateCountResult[0]?.count ?? 0)

  const total = STATIC_PAGES + actorCount + movieCount + rateCount

  console.log('Breakdown:')
  console.log(`  Static pages:        ${STATIC_PAGES}`)
  console.log(`  Actor pages (≥1):    ${actorCount}`)
  console.log(`  Movie pages (≥1 rated or ≥5 perf): ${movieCount} (adult excluded)`)
  console.log(`  Rate pages (≥1):     ${rateCount}`)
  console.log('  ─────────────────────────')
  console.log(`  Total indexed:      ${total}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
