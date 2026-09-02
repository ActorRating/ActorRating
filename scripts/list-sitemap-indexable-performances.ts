/**
 * List indexable /rate pairs that should appear in the performances sitemap,
 * using the same gates as scripts/generate-sitemaps.ts + admin cohort panel.
 *
 * Run: npx tsx scripts/list-sitemap-indexable-performances.ts
 * Optional: --missing-from=https://actorrating.com/sitemaps/performances-1.xml
 */
import dotenv from "dotenv"
dotenv.config()

import { PrismaClient } from "@prisma/client"
import { SYSTEM_USER_ID } from "../src/lib/movie-ingestion"
import { isRatePageIndexable, MIN_COMMUNITY_RATINGS_FOR_INDEX } from "../src/lib/rate-page-seo"
import { isSitemapEligibleRateMovie } from "../src/lib/rate-page-sitemap-eligibility"

const prisma = new PrismaClient()

type Row = {
  actorId: string
  movieId: string
  actorSlug: string | null
  movieSlug: string | null
  actorName: string
  movieTitle: string
  movieYear: number
  movieGenre: string | null
  movieOverview: string | null
  isFeaturette: boolean
  releaseDate: Date | null
  tier: string
  ratingCount: bigint
  indexingCohort: number
}

async function main() {
  const missingFromArg = process.argv.find((a) => a.startsWith("--missing-from="))
  const missingFromUrl = missingFromArg?.split("=")[1]

  const rows = await prisma.$queryRaw<Row[]>`
    WITH rated AS (
      SELECT r."actorId", r."movieId", COUNT(*)::bigint AS "ratingCount"
      FROM "Rating" r
      GROUP BY r."actorId", r."movieId"
      HAVING COUNT(*) >= ${MIN_COMMUNITY_RATINGS_FOR_INDEX}
    ),
    perf AS (
      SELECT DISTINCT ON (p."actorId", p."movieId")
        p."actorId",
        p."movieId",
        p.tier::text AS tier,
        a.name AS "actorName",
        a.slug AS "actorSlug",
        m.title AS "movieTitle",
        m.slug AS "movieSlug",
        m.year AS "movieYear",
        m.genre AS "movieGenre",
        m.overview AS "movieOverview",
        m."isFeaturette" AS "isFeaturette",
        m."releaseDate" AS "releaseDate",
        m."indexingCohort" AS "indexingCohort"
      FROM "Performance" p
      INNER JOIN "Movie" m ON m.id = p."movieId"
      INNER JOIN "Actor" a ON a.id = p."actorId"
      WHERE NOT m."isFeaturette"
        AND p.tier IN ('LEAD', 'SUPPORTING')
      ORDER BY
        p."actorId",
        p."movieId",
        CASE WHEN p."userId" = ${SYSTEM_USER_ID} THEN 0 ELSE 1 END,
        p."order" ASC NULLS LAST,
        p."createdAt" ASC
    )
    SELECT
      r."actorId",
      r."movieId",
      p."actorSlug",
      p."movieSlug",
      p."actorName",
      p."movieTitle",
      p."movieYear",
      p."movieGenre",
      p."movieOverview",
      p."isFeaturette",
      p."releaseDate",
      p.tier,
      r."ratingCount",
      p."indexingCohort"
    FROM rated r
    INNER JOIN perf p
      ON p."actorId" = r."actorId" AND p."movieId" = r."movieId"
  `

  const eligible: string[] = []
  let skippedMovie = 0
  let skippedGate = 0

  for (const row of rows) {
    const movieSlug = row.movieSlug
    const actorSlug = row.actorSlug
    if (
      !isSitemapEligibleRateMovie({
        slug: movieSlug,
        id: row.movieId,
        title: row.movieTitle,
        genre: row.movieGenre,
        overview: row.movieOverview,
        isFeaturette: row.isFeaturette,
        releaseDate: row.releaseDate,
        year: row.movieYear,
      })
    ) {
      skippedMovie += 1
      continue
    }
    if (
      !isRatePageIndexable({
        movieSlug,
        movieTitle: row.movieTitle,
        indexingCohort: row.indexingCohort,
        seededAggregateScore: null,
        communityRatingCount: Number(row.ratingCount),
        tier: row.tier,
      })
    ) {
      skippedGate += 1
      continue
    }
    const href = `/rate/${movieSlug || row.movieId}/${actorSlug || row.actorId}`
    eligible.push(href)
  }

  eligible.sort()
  console.log(`Eligible sitemap performance URLs: ${eligible.length}`)
  console.log(`  (raw ≥${MIN_COMMUNITY_RATINGS_FOR_INDEX} LEAD/SUPPORTING pairs: ${rows.length})`)
  console.log(`  skipped movie filter: ${skippedMovie}`)
  console.log(`  skipped indexability: ${skippedGate}`)

  if (missingFromUrl) {
    const xml = await fetch(missingFromUrl).then((r) => r.text())
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
      try {
        return new URL(m[1]).pathname
      } catch {
        return m[1]
      }
    })
    const inSitemap = new Set(locs)
    const missing = eligible.filter((h) => !inSitemap.has(h))
    console.log(`\nCompared to ${missingFromUrl} (${locs.length} locs)`)
    console.log(`Missing from live sitemap: ${missing.length}`)
    for (const h of missing.slice(0, 50)) console.log(`  ${h}`)
    if (missing.length > 50) console.log(`  … +${missing.length - 50} more`)
  } else {
    for (const h of eligible.slice(0, 20)) console.log(`  ${h}`)
    if (eligible.length > 20) console.log(`  … +${eligible.length - 20} more`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
