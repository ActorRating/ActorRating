import type { PrismaClient } from "@prisma/client"
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
 */
export async function listEditorialGenerationQueue(
  prisma: PrismaClient,
  opts: { limit?: number; minRatings?: number } = {},
): Promise<EditorialQueueItem[]> {
  const limit = opts.limit ?? 50
  const minRatings = opts.minRatings ?? 1

  const rated = await prisma.$queryRaw<
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
      ratingCount: number
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
      (
        SELECT COUNT(*)::int FROM "Rating" r
        WHERE r."actorId" = p."actorId"
          AND r."movieId" = p."movieId"
          AND r."userId" IS NOT NULL
      ) AS "ratingCount",
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
      AND (
        SELECT COUNT(*) FROM "Rating" r
        WHERE r."actorId" = p."actorId"
          AND r."movieId" = p."movieId"
          AND r."userId" IS NOT NULL
      ) >= ${minRatings}
    ORDER BY "ratingCount" DESC, m.year DESC
    LIMIT ${Math.max(limit * 3, 50)}
  `

  const out: EditorialQueueItem[] = []
  for (const row of rated) {
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
    out.push({
      actorId: row.actorId,
      movieId: row.movieId,
      actorName: row.actorName,
      movieTitle: row.movieTitle,
      movieYear: row.movieYear,
      ratingCount: row.ratingCount,
      reason: row.editorialStatus === "NEEDS_REGEN" ? "needs_regen" : "missing",
    })
    if (out.length >= limit) break
  }
  return out
}
