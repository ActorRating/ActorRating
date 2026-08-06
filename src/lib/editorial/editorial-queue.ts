import { Prisma, type PrismaClient } from "@prisma/client"
import { SYSTEM_USER_ID } from "@/lib/movie-ingestion"
import { isRatePageIndexable } from "@/lib/rate-page-seo"

export type EditorialQueueItem = {
  actorId: string
  movieId: string
  actorName: string
  movieTitle: string
  movieYear: number
  ratingCount: number
  reason: "missing" | "needs_regen"
}

type CandidateRow = {
  actorId: string
  movieId: string
  actorName: string
  movieTitle: string
  movieYear: number
  movieSlug: string | null
  cohort: number
  tier: string | null
  seeded: number | null
  editorialStatus: string | null
  ratingCount: number
}

/**
 * Indexable performances missing editorial or marked NEEDS_REGEN.
 *
 * Two cheap paths (avoids full-table correlated COUNT that hung Generate):
 * 1) Cohort-1 + seeded score, missing/regen — indexable without community ratings
 * 2) Performances that already have community ratings and are missing/regen
 */
export async function listEditorialGenerationQueue(
  prisma: PrismaClient,
  opts: { limit?: number; minRatings?: number } = {},
): Promise<EditorialQueueItem[]> {
  const limit = opts.limit ?? 50
  const minRatings = opts.minRatings ?? 1
  const window = Math.max(limit * 10, 150)

  const seededPath = await prisma.$queryRaw<CandidateRow[]>`
    SELECT
      p."actorId" AS "actorId",
      p."movieId" AS "movieId",
      a.name AS "actorName",
      m.title AS "movieTitle",
      m.year AS "movieYear",
      m.slug AS "movieSlug",
      m."indexingCohort" AS cohort,
      p.tier::text AS tier,
      p."seededAggregateScore"::float AS seeded,
      e.status::text AS "editorialStatus",
      0::int AS "ratingCount"
    FROM "Performance" p
    INNER JOIN "Actor" a ON a.id = p."actorId"
    INNER JOIN "Movie" m ON m.id = p."movieId"
    LEFT JOIN "PerformanceEditorial" e
      ON e."actorId" = p."actorId" AND e."movieId" = p."movieId"
    WHERE p."userId" = ${SYSTEM_USER_ID}
      AND p.tier IN ('LEAD', 'SUPPORTING')
      AND NOT m."isFeaturette"
      AND m."indexingCohort" = 1
      AND p."seededAggregateScore" IS NOT NULL
      AND (
        e.id IS NULL
        OR e.status = 'NEEDS_REGEN'::"EditorialStatus"
      )
    ORDER BY p."seededAggregateScore" DESC, m.year DESC
    LIMIT ${window}
  `

  const communityPath = await prisma.$queryRaw<CandidateRow[]>`
    SELECT
      p."actorId" AS "actorId",
      p."movieId" AS "movieId",
      a.name AS "actorName",
      m.title AS "movieTitle",
      m.year AS "movieYear",
      m.slug AS "movieSlug",
      m."indexingCohort" AS cohort,
      p.tier::text AS tier,
      p."seededAggregateScore"::float AS seeded,
      e.status::text AS "editorialStatus",
      rc.cnt::int AS "ratingCount"
    FROM (
      SELECT r."actorId", r."movieId", COUNT(*)::int AS cnt
      FROM "Rating" r
      WHERE r."userId" IS NOT NULL
      GROUP BY r."actorId", r."movieId"
      HAVING COUNT(*) >= ${Math.max(minRatings, 1)}
    ) rc
    INNER JOIN "Performance" p
      ON p."actorId" = rc."actorId"
     AND p."movieId" = rc."movieId"
     AND p."userId" = ${SYSTEM_USER_ID}
    INNER JOIN "Actor" a ON a.id = p."actorId"
    INNER JOIN "Movie" m ON m.id = p."movieId"
    LEFT JOIN "PerformanceEditorial" e
      ON e."actorId" = p."actorId" AND e."movieId" = p."movieId"
    WHERE p.tier IN ('LEAD', 'SUPPORTING')
      AND NOT m."isFeaturette"
      AND (
        e.id IS NULL
        OR e.status = 'NEEDS_REGEN'::"EditorialStatus"
      )
    ORDER BY rc.cnt DESC, m.year DESC
    LIMIT ${window}
  `

  const byKey = new Map<string, CandidateRow>()
  for (const row of [...seededPath, ...communityPath]) {
    const key = `${row.actorId}:${row.movieId}`
    const prev = byKey.get(key)
    if (!prev || row.ratingCount > prev.ratingCount) {
      byKey.set(key, row)
    }
  }

  // Seeded-path rows may still have community ratings — fill counts for sorting/minRatings.
  const needCounts = [...byKey.values()].filter((r) => r.ratingCount === 0)
  if (needCounts.length > 0) {
    const pairValues = Prisma.join(
      needCounts.map((c) => Prisma.sql`(${c.actorId}, ${c.movieId})`),
    )
    const counts = await prisma.$queryRaw<
      Array<{ actorId: string; movieId: string; cnt: number }>
    >`
      SELECT r."actorId" AS "actorId", r."movieId" AS "movieId", COUNT(*)::int AS cnt
      FROM "Rating" r
      WHERE r."userId" IS NOT NULL
        AND (r."actorId", r."movieId") IN (${pairValues})
      GROUP BY r."actorId", r."movieId"
    `
    for (const row of counts) {
      const key = `${row.actorId}:${row.movieId}`
      const cur = byKey.get(key)
      if (cur) byKey.set(key, { ...cur, ratingCount: row.cnt })
    }
  }

  const scored: EditorialQueueItem[] = []
  for (const row of byKey.values()) {
    if (row.ratingCount < minRatings) continue
    if (
      !isRatePageIndexable({
        movieSlug: row.movieSlug,
        movieTitle: row.movieTitle,
        indexingCohort: row.cohort,
        seededAggregateScore: row.seeded,
        communityRatingCount: row.ratingCount,
        tier: row.tier,
      })
    ) {
      continue
    }
    scored.push({
      actorId: row.actorId,
      movieId: row.movieId,
      actorName: row.actorName,
      movieTitle: row.movieTitle,
      movieYear: row.movieYear,
      ratingCount: row.ratingCount,
      reason: row.editorialStatus === "NEEDS_REGEN" ? "needs_regen" : "missing",
    })
  }

  scored.sort((a, b) => b.ratingCount - a.ratingCount || b.movieYear - a.movieYear)
  return scored.slice(0, limit)
}
