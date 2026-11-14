/**
 * Top community performances / actors / movies by signed-in rating volume.
 * Used for crawlable internal links on /discover and the homepage.
 *
 * Ranking uses signed-in Rating rows only (userId IS NOT NULL).
 * Indexability for /rate links still uses isRatePageIndexable (all ratings).
 */

import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"
import { isRatePageIndexable } from "@/lib/rate-page-seo"
import { getActorUrl, getMovieUrl, getRateUrl } from "@/lib/slugHelper"

/** Must match SYSTEM_USER_ID in movie-ingestion (canonical Performance pick). */
const SYSTEM_USER_ID = "uuid-from-auth-users"

export const TOP_RATED_REVALIDATE_SECONDS = 3600

export type TopRatedPerformanceLink = {
  actorId: string
  movieId: string
  actorName: string
  actorSlug: string | null
  movieTitle: string
  movieSlug: string | null
  movieYear: number
  character: string | null
  /** Signed-in rating count (ranking signal). */
  signedInCount: number
  /** All community ratings (indexability). */
  communityRatingCount: number
  /** Community average 0–10 from signed-in ratings only; null when none. */
  avgScore10: number | null
  tier: string | null
  href: string
  indexable: boolean
}

export type TopRatedActorLink = {
  actorId: string
  name: string
  slug: string | null
  signedInCount: number
  href: string
}

export type TopRatedMovieLink = {
  movieId: string
  title: string
  slug: string | null
  year: number | null
  signedInCount: number
  href: string
}

type PerfRow = {
  actorId: string
  movieId: string
  actorName: string
  actorSlug: string | null
  movieTitle: string
  movieSlug: string | null
  movieYear: number
  character: string | null
  tier: string | null
  signedInCount: bigint | number
  communityRatingCount: bigint | number
  avgScore: number | null
}

type ActorRow = {
  actorId: string
  name: string
  slug: string | null
  signedInCount: bigint | number
}

type MovieRow = {
  movieId: string
  title: string
  slug: string | null
  year: number | null
  signedInCount: bigint | number
}

function toInt(v: bigint | number | null | undefined): number {
  if (typeof v === "bigint") return Number(v)
  return v ?? 0
}

function toAvg10(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null
  return Math.round(v * 10) / 10
}

/** Pure: keep only indexable rate pages. Exported for tests. */
export function filterIndexablePerformanceLinks(
  rows: TopRatedPerformanceLink[],
): TopRatedPerformanceLink[] {
  return rows.filter((r) => r.indexable)
}

function mapPerfRow(row: PerfRow): TopRatedPerformanceLink {
  const communityRatingCount = toInt(row.communityRatingCount)
  const signedInCount = toInt(row.signedInCount)
  const indexable = isRatePageIndexable({
    movieSlug: row.movieSlug,
    movieTitle: row.movieTitle,
    indexingCohort: null,
    seededAggregateScore: null,
    communityRatingCount,
    tier: row.tier,
  })
  const actor = {
    id: row.actorId,
    name: row.actorName,
    slug: row.actorSlug,
  }
  const movie = {
    id: row.movieId,
    title: row.movieTitle,
    year: row.movieYear,
    slug: row.movieSlug,
  }
  return {
    actorId: row.actorId,
    movieId: row.movieId,
    actorName: row.actorName,
    actorSlug: row.actorSlug,
    movieTitle: row.movieTitle,
    movieSlug: row.movieSlug,
    movieYear: row.movieYear,
    character: row.character,
    signedInCount,
    communityRatingCount,
    avgScore10: toAvg10(row.avgScore),
    tier: row.tier,
    href: getRateUrl(actor, movie),
    indexable,
  }
}

/**
 * Top (actor, movie) pairs by signed-in rating count.
 * Over-fetches then filters to indexable rate pages when `indexableOnly`.
 */
export async function getTopRatedPerformancesBySignedIn(options?: {
  limit?: number
  indexableOnly?: boolean
  fetchMultiplier?: number
}): Promise<TopRatedPerformanceLink[]> {
  const limit = options?.limit ?? 30
  const indexableOnly = options?.indexableOnly ?? true
  const fetchMultiplier = options?.fetchMultiplier ?? 3
  const fetchLimit = indexableOnly ? Math.max(limit * fetchMultiplier, limit) : limit
  const cacheKey = makeCacheKey("top-rated:performances:v1", [
    limit,
    indexableOnly ? 1 : 0,
    fetchLimit,
  ])
  const cached = await cacheGet<TopRatedPerformanceLink[]>(cacheKey)
  if (cached) return cached

  const rows = await prisma.$queryRaw<PerfRow[]>`
    WITH signed AS (
      SELECT
        r."actorId",
        r."movieId",
        COUNT(*)::int AS "signedInCount",
        AVG(
          (
            r."emotionalRangeDepth" +
            r."characterBelievability" +
            r."technicalSkill" +
            r."screenPresence" +
            r."chemistryInteraction"
          ) / 5.0
        ) AS "avgScore"
      FROM "Rating" r
      WHERE r."userId" IS NOT NULL
      GROUP BY r."actorId", r."movieId"
    ),
    community AS (
      SELECT r."actorId", r."movieId", COUNT(*)::int AS "communityRatingCount"
      FROM "Rating" r
      GROUP BY r."actorId", r."movieId"
    )
    SELECT
      s."actorId",
      s."movieId",
      a.name AS "actorName",
      a.slug AS "actorSlug",
      m.title AS "movieTitle",
      m.slug AS "movieSlug",
      m.year AS "movieYear",
      c.character,
      c.tier::text AS tier,
      s."signedInCount",
      COALESCE(com."communityRatingCount", 0) AS "communityRatingCount",
      s."avgScore"
    FROM signed s
    JOIN "Actor" a ON a.id = s."actorId"
    JOIN "Movie" m ON m.id = s."movieId"
    JOIN community com ON com."actorId" = s."actorId" AND com."movieId" = s."movieId"
    LEFT JOIN LATERAL (
      SELECT p.tier, p.character
      FROM "Performance" p
      WHERE p."actorId" = s."actorId" AND p."movieId" = s."movieId"
      ORDER BY
        CASE
          WHEN p.tier IN ('LEAD', 'SUPPORTING') THEN 0
          WHEN p.tier IS NOT NULL AND p.tier::text <> 'MINOR' THEN 1
          WHEN p.tier = 'MINOR' THEN 2
          ELSE 3
        END,
        CASE WHEN p."userId" = ${SYSTEM_USER_ID} THEN 0 ELSE 1 END,
        p."order" ASC NULLS LAST,
        p."createdAt" ASC
      LIMIT 1
    ) c ON TRUE
    WHERE NOT m."isFeaturette"
    ORDER BY s."signedInCount" DESC, s."avgScore" DESC NULLS LAST
    LIMIT ${fetchLimit}
  `

  let mapped = rows.map(mapPerfRow)
  if (indexableOnly) {
    mapped = filterIndexablePerformanceLinks(mapped).slice(0, limit)
  } else {
    mapped = mapped.slice(0, limit)
  }

  await cacheSet(cacheKey, mapped, TOP_RATED_REVALIDATE_SECONDS)
  return mapped
}

export async function getTopRatedActorsBySignedIn(
  limit = 20,
): Promise<TopRatedActorLink[]> {
  const cacheKey = makeCacheKey("top-rated:actors:v1", [limit])
  const cached = await cacheGet<TopRatedActorLink[]>(cacheKey)
  if (cached) return cached

  const rows = await prisma.$queryRaw<ActorRow[]>`
    SELECT
      a.id AS "actorId",
      a.name,
      a.slug,
      COUNT(*)::int AS "signedInCount"
    FROM "Rating" r
    JOIN "Actor" a ON a.id = r."actorId"
    WHERE r."userId" IS NOT NULL
    GROUP BY a.id, a.name, a.slug
    ORDER BY COUNT(*) DESC
    LIMIT ${limit}
  `

  const mapped = rows.map((r) => ({
    actorId: r.actorId,
    name: r.name,
    slug: r.slug,
    signedInCount: toInt(r.signedInCount),
    href: getActorUrl({ id: r.actorId, name: r.name, slug: r.slug }),
  }))

  await cacheSet(cacheKey, mapped, TOP_RATED_REVALIDATE_SECONDS)
  return mapped
}

export async function getTopRatedMoviesBySignedIn(
  limit = 10,
): Promise<TopRatedMovieLink[]> {
  const cacheKey = makeCacheKey("top-rated:movies:v1", [limit])
  const cached = await cacheGet<TopRatedMovieLink[]>(cacheKey)
  if (cached) return cached

  const rows = await prisma.$queryRaw<MovieRow[]>`
    SELECT
      m.id AS "movieId",
      m.title,
      m.slug,
      m.year,
      COUNT(*)::int AS "signedInCount"
    FROM "Rating" r
    JOIN "Movie" m ON m.id = r."movieId"
    WHERE r."userId" IS NOT NULL
      AND NOT m."isFeaturette"
    GROUP BY m.id, m.title, m.slug, m.year
    ORDER BY COUNT(*) DESC
    LIMIT ${limit}
  `

  const mapped = rows.map((r) => ({
    movieId: r.movieId,
    title: r.title,
    slug: r.slug,
    year: r.year,
    signedInCount: toInt(r.signedInCount),
    href:
      r.year != null
        ? getMovieUrl({
            id: r.movieId,
            title: r.title,
            year: r.year,
            slug: r.slug,
          })
        : `/movies/${r.slug ?? r.movieId}`,
  }))

  await cacheSet(cacheKey, mapped, TOP_RATED_REVALIDATE_SECONDS)
  return mapped
}
