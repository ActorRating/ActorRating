import "server-only"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/admin/cache"
import { SYSTEM_USER_ID } from "@/lib/movie-ingestion"
import { isSelfOnlyCreditPair } from "@/lib/non-rateable"
import {
  isMalformedMovieForSeo,
  isRatePageIndexable,
  MIN_COMMUNITY_RATINGS_FOR_INDEX,
} from "@/lib/rate-page-seo"
import { isSitemapEligibleRateMovie } from "@/lib/rate-page-sitemap-eligibility"

export type Cohort1CrossedRow = {
  actorId: string
  movieId: string
  actorName: string
  actorSlug: string | null
  movieTitle: string
  movieSlug: string | null
  movieYear: number
  tier: string
  ratingCount: number
  /** When the 2nd rating landed (crossed ≥2). */
  crossedAt: Date
  lastRatedAt: Date
  /** True when the pair would pass the performances sitemap gate. */
  wouldIndex: boolean
  rateHref: string
}

const CACHE_TTL_MS = 60_000
/** Lookback for “just crossed ≥2” (2nd rating timestamp). */
export const COHORT1_CROSS_LOOKBACK_DAYS = 14

type RawRow = {
  actorId: string
  movieId: string
  actorName: string
  actorSlug: string | null
  movieTitle: string
  movieSlug: string | null
  movieYear: number
  movieGenre: string | null
  movieOverview: string | null
  isFeaturette: boolean
  releaseDate: Date | null
  tier: string
  ratingCount: bigint | number
  crossedAt: Date
  lastRatedAt: Date
  characters: string[] | null
}

/**
 * Cohort-1 LEAD/SUPPORTING performances whose 2nd community rating landed
 * within the lookback window.
 *
 * Indexability matches the performances sitemap:
 * - all Rating rows count (signed + anonymous)
 * - canonical Performance tier via the same ORDER BY as pickCanonicalPerformanceSeoMeta
 * - isRatePageIndexable + isSitemapEligibleRateMovie
 */
export async function getCohort1RecentlyCrossedIndexable(options?: {
  lookbackDays?: number
  limit?: number
}): Promise<{
  rows: Cohort1CrossedRow[]
  lookbackDays: number
  threshold: number
}> {
  const lookbackDays = options?.lookbackDays ?? COHORT1_CROSS_LOOKBACK_DAYS
  const limit = options?.limit ?? 75
  const cacheKey = `admin:cohort1-crossed:v3:${lookbackDays}:${limit}`

  const cached = getCache<{
    rows: Cohort1CrossedRow[]
    lookbackDays: number
    threshold: number
  }>(cacheKey)
  if (cached) return cached

  try {
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)

    // Canonical ORDER BY must stay in sync with pickCanonicalPerformanceSeoMeta /
    // scripts/generate-sitemaps.ts (LEAD/SUPPORTING first, then system user, order, createdAt).
    const raw = await prisma.$queryRaw<RawRow[]>`
      WITH ranked_ratings AS (
        SELECT
          r."actorId",
          r."movieId",
          r."createdAt",
          ROW_NUMBER() OVER (
            PARTITION BY r."actorId", r."movieId"
            ORDER BY r."createdAt" ASC, r.id ASC
          ) AS rn,
          COUNT(*) OVER (PARTITION BY r."actorId", r."movieId") AS "ratingCount",
          MAX(r."createdAt") OVER (PARTITION BY r."actorId", r."movieId") AS "lastRatedAt"
        FROM "Rating" r
      ),
      crossed AS (
        SELECT
          "actorId",
          "movieId",
          "createdAt" AS "crossedAt",
          "ratingCount",
          "lastRatedAt"
        FROM ranked_ratings
        WHERE rn = 2
          AND "createdAt" >= ${since}
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
          m."releaseDate" AS "releaseDate"
        FROM "Performance" p
        INNER JOIN "Movie" m ON m.id = p."movieId"
        INNER JOIN "Actor" a ON a.id = p."actorId"
        WHERE m."indexingCohort" = 1
          AND NOT m."isFeaturette"
          AND p.tier IN ('LEAD', 'SUPPORTING')
        ORDER BY
          p."actorId",
          p."movieId",
          CASE WHEN p."userId" = ${SYSTEM_USER_ID} THEN 0 ELSE 1 END,
          p."order" ASC NULLS LAST,
          p."createdAt" ASC
      ),
      chars AS (
        SELECT
          p."actorId",
          p."movieId",
          ARRAY_AGG(p.character) AS characters
        FROM "Performance" p
        GROUP BY p."actorId", p."movieId"
      )
      SELECT
        c."actorId",
        c."movieId",
        p."actorName",
        p."actorSlug",
        p."movieTitle",
        p."movieSlug",
        p."movieYear",
        p."movieGenre",
        p."movieOverview",
        p."isFeaturette",
        p."releaseDate",
        p.tier,
        c."ratingCount",
        c."crossedAt",
        c."lastRatedAt",
        ch.characters
      FROM crossed c
      INNER JOIN perf p
        ON p."actorId" = c."actorId" AND p."movieId" = c."movieId"
      LEFT JOIN chars ch
        ON ch."actorId" = c."actorId" AND ch."movieId" = c."movieId"
      ORDER BY c."crossedAt" DESC
      LIMIT ${limit}
    `

    const rows: Cohort1CrossedRow[] = raw.map((row) => {
      const ratingCount = Number(row.ratingCount)
      const movieSlug = row.movieSlug
      const actorSlug = row.actorSlug
      const movieId = row.movieId
      const sitemapMovieOk = isSitemapEligibleRateMovie({
        slug: movieSlug,
        id: movieId,
        title: row.movieTitle,
        genre: row.movieGenre,
        overview: row.movieOverview,
        isFeaturette: row.isFeaturette,
        releaseDate: row.releaseDate,
        year: row.movieYear,
      })
      const wouldIndex =
        sitemapMovieOk &&
        !isSelfOnlyCreditPair(row.characters ?? []) &&
        !isMalformedMovieForSeo(movieSlug, row.movieTitle) &&
        isRatePageIndexable({
          movieSlug,
          movieTitle: row.movieTitle,
          indexingCohort: 1,
          seededAggregateScore: null,
          communityRatingCount: ratingCount,
          tier: row.tier,
        })

      const movieSeg = movieSlug || row.movieId
      const actorSeg = actorSlug || row.actorId

      return {
        actorId: row.actorId,
        movieId: row.movieId,
        actorName: row.actorName,
        actorSlug,
        movieTitle: row.movieTitle,
        movieSlug,
        movieYear: row.movieYear,
        tier: row.tier,
        ratingCount,
        crossedAt: new Date(row.crossedAt),
        lastRatedAt: new Date(row.lastRatedAt),
        wouldIndex,
        rateHref: `/rate/${movieSeg}/${actorSeg}`,
      }
    })

    const result = {
      rows,
      lookbackDays,
      threshold: MIN_COMMUNITY_RATINGS_FOR_INDEX,
    }
    setCache(cacheKey, result, CACHE_TTL_MS)
    return result
  } catch (error) {
    console.error("getCohort1RecentlyCrossedIndexable failed:", error)
    return {
      rows: [],
      lookbackDays,
      threshold: MIN_COMMUNITY_RATINGS_FOR_INDEX,
    }
  }
}
