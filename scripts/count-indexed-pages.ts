/**
 * Count total indexed pages site-wide with current rules (aligned with sitemap + layouts):
 * - Static: 6 (home, about, signin, signup, privacy, oscars-2026)
 * - Actor pages: any Performance or Rating on a non-featurette film
 * - Movie pages: same eligibility, excluding adult content (title/genre/overview) like sitemap
 * - Rate pages: distinct (actorId, movieId) in Performance ∪ Rating on non-featurette films
 *
 * Run: npx tsx scripts/count-indexed-pages.ts
 */
import { prisma } from '../src/lib/prisma'
import { isAdultContentMovie, isAdultContentSlug } from '../src/lib/adult-content-filter'
import { isJunkMovieSlug, isAllowedMovieSlug } from '../src/lib/junk-movie-slugs'
import { getDistinctRatePagePairCount } from '../src/lib/sitemap-rate-pairs'

const STATIC_PAGES = 6

async function main() {
  console.log('Counting indexed pages (sitemap + no noindex)...\n')

  const actorRows = await prisma.$queryRaw<Array<{ actorId: string }>>`
    SELECT DISTINCT p."actorId" FROM "Performance" p
    INNER JOIN "Movie" m ON m.id = p."movieId" AND NOT m."isFeaturette"
    UNION
    SELECT DISTINCT r."actorId" FROM "Rating" r
    INNER JOIN "Movie" m ON m.id = r."movieId" AND NOT m."isFeaturette"
  `
  const actorCount = new Set(actorRows.map((r) => r.actorId)).size

  const movieRows = await prisma.$queryRaw<Array<{ movieId: string }>>`
    SELECT DISTINCT p."movieId" FROM "Performance" p
    INNER JOIN "Movie" m ON m.id = p."movieId" AND NOT m."isFeaturette"
    UNION
    SELECT DISTINCT r."movieId" FROM "Rating" r
    INNER JOIN "Movie" m ON m.id = r."movieId" AND NOT m."isFeaturette"
  `
  const movieIds = [...new Set(movieRows.map((r) => r.movieId))]
  const movies = await prisma.movie.findMany({
    where: { id: { in: movieIds } },
    select: { slug: true, id: true, title: true, genre: true, overview: true },
  })
  const movieCount = movies.filter((m) => {
    const slug = m.slug ?? m.id
    if (isAllowedMovieSlug(slug)) return true
    if (isJunkMovieSlug(slug)) return false
    if (isAdultContentSlug(slug)) return false
    if (isAdultContentMovie({ title: m.title, genre: m.genre, overview: m.overview })) return false
    return true
  }).length

  const rateCount = await getDistinctRatePagePairCount()

  const total = STATIC_PAGES + actorCount + movieCount + rateCount

  console.log('Breakdown:')
  console.log(`  Static pages:        ${STATIC_PAGES}`)
  console.log(`  Actor pages:         ${actorCount}`)
  console.log(`  Movie pages:         ${movieCount} (junk/adult slug+title excluded, same as sitemap)`)
  console.log(`  Rate page pairs:     ${rateCount}`)
  console.log('  ─────────────────────────')
  console.log(`  Total indexed:      ${total}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
