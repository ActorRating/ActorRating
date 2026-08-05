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

/**
 * Indexable performances missing editorial or marked NEEDS_REGEN, highest rating count first.
 *
 * Avoids correlated COUNT(*) over the full Performance table (that hung admin Generate).
 * Pull a candidate window, then count ratings only for those pairs.
 */
export async function listEditorialGenerationQueue(
  prisma: PrismaClient,
  opts: { limit?: number; minRatings?: number } = {},
): Promise<EditorialQueueItem[]> {
  const limit = opts.limit ?? 50
  const minRatings = opts.minRatings ?? 1
  const candidateWindow = Math.max(limit * 8, 120)

  const candidates = await prisma.$queryRaw<
    Array<{
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
    }>
  >`
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
      e.status::text AS "editorialStatus"
    FROM "Performance" p
    INNER JOIN "Actor" a ON a.id = p."actorId"
    INNER JOIN "Movie" m ON m.id = p."movieId"
    LEFT JOIN "PerformanceEditorial" e
      ON e."actorId" = p."actorId" AND e."movieId" = p."movieId"
    WHERE p."userId" = ${SYSTEM_USER_ID}
      AND p.tier IN ('LEAD', 'SUPPORTING')
      AND NOT m."isFeaturette"
      AND (
        e.id IS NULL
        OR e.status = 'NEEDS_REGEN'::"EditorialStatus"
      )
    ORDER BY p."seededAggregateScore" DESC NULLS LAST, m.year DESC
    LIMIT ${candidateWindow}
  `

  if (candidates.length === 0) return []

  const pairValues = Prisma.join(
    candidates.map((c) => Prisma.sql`(${c.actorId}, ${c.movieId})`),
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

  const countMap = new Map<string, number>()
  for (const row of counts) {
    countMap.set(`${row.actorId}:${row.movieId}`, row.cnt)
  }

  const scored: EditorialQueueItem[] = []
  for (const row of candidates) {
    const ratingCount = countMap.get(`${row.actorId}:${row.movieId}`) ?? 0
    if (ratingCount < minRatings) continue
    if (
      !isRatePageIndexable({
        movieSlug: row.movieSlug,
        movieTitle: row.movieTitle,
        indexingCohort: row.cohort,
        seededAggregateScore: row.seeded,
        communityRatingCount: ratingCount,
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
      ratingCount,
      reason: row.editorialStatus === "NEEDS_REGEN" ? "needs_regen" : "missing",
    })
  }

  scored.sort((a, b) => b.ratingCount - a.ratingCount || b.movieYear - a.movieYear)
  return scored.slice(0, limit)
}
