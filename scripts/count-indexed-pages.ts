/**
 * Approximate counts aligned with current sitemap rules (see scripts/generate-sitemaps.ts):
 * - Static: home, about, privacy-policy, oscars-2026 (no auth URLs)
 * - Actors: ≥1 rating on non-featurette OR ≥5 performances on non-featurette
 * - Movies: same bar + junk/adult exclusion
 * - Rate pairs in sitemap: ≥1 rating (distinct) + small curated set (not counted here)
 *
 * Run: npx tsx scripts/count-indexed-pages.ts
 */
import { prisma } from '../src/lib/prisma'
import { isPublicSeoBlockedMovie } from '../src/lib/public-movie-seo-block'
import { getDistinctRatedRatePagePairCount } from '../src/lib/sitemap-rate-pairs'

const STATIC_PAGES = 4

async function main() {
  console.log('Counting URLs under current sitemap rules…\n')

  const actorRows = await prisma.$queryRaw<Array<{ actorId: string }>>`
    SELECT DISTINCT a.id AS "actorId"
    FROM "Actor" a
    WHERE
      EXISTS (
        SELECT 1 FROM "Rating" r
        INNER JOIN "Movie" m ON m.id = r."movieId" AND NOT m."isFeaturette"
        WHERE r."actorId" = a.id
      )
      OR (
        SELECT COUNT(*)::bigint FROM "Performance" p
        INNER JOIN "Movie" m ON m.id = p."movieId" AND NOT m."isFeaturette"
        WHERE p."actorId" = a.id
      ) >= 5
  `
  const actorCount = actorRows.length

  const movieRows = await prisma.$queryRaw<
    Array<{ id: string; slug: string | null; title: string; genre: string | null; overview: string | null }>
  >`
    SELECT m.id, m.slug, m.title, m.genre, m.overview
    FROM "Movie" m
    WHERE NOT m."isFeaturette"
      AND (
        EXISTS (SELECT 1 FROM "Rating" r WHERE r."movieId" = m.id)
        OR (SELECT COUNT(*)::bigint FROM "Performance" p WHERE p."movieId" = m.id) >= 5
      )
  `
  const movieCount = movieRows.filter((m) => {
    return !isPublicSeoBlockedMovie(m.slug ?? m.id, m.title, m.genre ?? null, m.overview ?? null)
  }).length

  const rateCount = await getDistinctRatedRatePagePairCount()

  const total = STATIC_PAGES + actorCount + movieCount + rateCount

  console.log('Breakdown:')
  console.log(`  Static pages:        ${STATIC_PAGES}`)
  console.log(`  Actor pages:         ${actorCount}`)
  console.log(`  Movie pages:         ${movieCount} (junk/adult excluded)`)
  console.log(`  Rate pairs (rated):  ${rateCount} (+ curated homepage targets in sitemap)`)
  console.log('  ─────────────────────────')
  console.log(`  Approx. total:       ${total}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
