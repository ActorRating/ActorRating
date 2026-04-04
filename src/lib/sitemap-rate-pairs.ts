import { prisma } from '@/lib/prisma'

/**
 * Distinct (actorId, movieId) pairs that have at least one row in Performance or Rating
 * on a non-featurette movie — same scope as indexable /rate/ URLs.
 */
export async function getDistinctRatePagePairCount(): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM (
      SELECT DISTINCT "actorId", "movieId"
      FROM (
        SELECT p."actorId", p."movieId"
        FROM "Performance" p
        INNER JOIN "Movie" m ON m.id = p."movieId" AND NOT m."isFeaturette"
        UNION
        SELECT r."actorId", r."movieId"
        FROM "Rating" r
        INNER JOIN "Movie" m ON m.id = r."movieId" AND NOT m."isFeaturette"
      ) sub
    ) t
  `
  return Number(rows[0]?.count ?? 0)
}

export type RatePagePairRow = {
  actorId: string
  movieId: string
  maxUpd: Date
}

/** Non-overlapping pages: each page takes the next chunk of merged pairs (newest first). */
export async function getDistinctRatePagePairsPage(
  pageNum: number,
  chunkSize: number
): Promise<RatePagePairRow[]> {
  if (pageNum < 1) return []
  const skip = (pageNum - 1) * chunkSize
  return prisma.$queryRaw<RatePagePairRow[]>`
    WITH merged AS (
      SELECT "actorId", "movieId", MAX(upd) AS "maxUpd"
      FROM (
        SELECT p."actorId", p."movieId", p."updatedAt" AS upd
        FROM "Performance" p
        INNER JOIN "Movie" m ON m.id = p."movieId" AND NOT m."isFeaturette"
        UNION ALL
        SELECT r."actorId", r."movieId", r."updatedAt" AS upd
        FROM "Rating" r
        INNER JOIN "Movie" m ON m.id = r."movieId" AND NOT m."isFeaturette"
      ) u
      GROUP BY "actorId", "movieId"
    )
    SELECT "actorId", "movieId", "maxUpd"
    FROM merged
    ORDER BY "maxUpd" DESC
    LIMIT ${chunkSize}
    OFFSET ${skip}
  `
}
