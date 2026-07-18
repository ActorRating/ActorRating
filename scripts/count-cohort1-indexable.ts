/**
 * Count cohort-1 indexable rate-page pairs before/after MINOR-tier gate.
 *
 * Usage: npx tsx scripts/count-cohort1-indexable.ts
 */
import dotenv from "dotenv"
dotenv.config()

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const MALFORMED_MOVIE_SLUG_RE = /^-\d{4}(-[a-z0-9]+)?$/i

function isMalformed(slug: string | null, title: string | null): boolean {
  if (!(title ?? "").trim()) return true
  const s = (slug ?? "").trim()
  if (!s) return false
  return MALFORMED_MOVIE_SLUG_RE.test(s)
}

async function main() {
  // One canonical performance per (actorId, movieId): prefer system user, else lowest order.
  const rows = await prisma.$queryRaw<
    Array<{
      actorId: string
      movieId: string
      tier: string
      seededAggregateScore: number | null
      slug: string | null
      title: string
      ratingCount: bigint
    }>
  >`
    WITH ranked AS (
      SELECT
        p."actorId",
        p."movieId",
        p.tier::text AS tier,
        p."seededAggregateScore",
        m.slug,
        m.title,
        ROW_NUMBER() OVER (
          PARTITION BY p."actorId", p."movieId"
          ORDER BY
            CASE WHEN p."userId" = 'uuid-from-auth-users' THEN 0 ELSE 1 END,
            p."order" ASC NULLS LAST,
            p."createdAt" ASC
        ) AS rn
      FROM "Performance" p
      INNER JOIN "Movie" m ON m.id = p."movieId"
      WHERE m."indexingCohort" = 1
        AND NOT m."isFeaturette"
    )
    SELECT
      r."actorId",
      r."movieId",
      r.tier,
      r."seededAggregateScore",
      r.slug,
      r.title,
      (
        SELECT COUNT(*)::bigint FROM "Rating" rt
        WHERE rt."actorId" = r."actorId" AND rt."movieId" = r."movieId"
      ) AS "ratingCount"
    FROM ranked r
    WHERE r.rn = 1
  `

  let before = 0
  let after = 0
  let minorExcluded = 0
  let malformedExcluded = 0
  let noSignal = 0
  const byTier: Record<string, number> = {}

  for (const row of rows) {
    byTier[row.tier] = (byTier[row.tier] ?? 0) + 1
    if (isMalformed(row.slug, row.title)) {
      malformedExcluded += 1
      continue
    }
    const hasCommunity = Number(row.ratingCount) >= 1
    const hasSeeded =
      typeof row.seededAggregateScore === "number" && Number.isFinite(row.seededAggregateScore)
    if (!(hasSeeded || hasCommunity)) {
      noSignal += 1
      continue
    }
    before += 1
    if (row.tier === "MINOR") {
      minorExcluded += 1
      continue
    }
    after += 1
  }

  console.log("========== COHORT-1 INDEXABLE RATE PAGES ==========")
  console.log(`  Distinct performance pairs considered: ${rows.length}`)
  console.log(`  Tier breakdown (canonical row):       ${JSON.stringify(byTier)}`)
  console.log(`  Excluded malformed:                   ${malformedExcluded}`)
  console.log(`  Excluded no seeded/community signal:  ${noSignal}`)
  console.log(`  BEFORE (no tier filter):              ${before}`)
  console.log(`  AFTER  (tier !== MINOR):              ${after}`)
  console.log(`  Dropped by MINOR gate:                ${minorExcluded}`)
  console.log("===================================================")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
