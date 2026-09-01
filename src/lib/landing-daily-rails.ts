/**
 * Server-only daily landing / discover rails.
 * Popular + recent rotate by UTC date; legendary stays curated.
 */

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"
import { isStaticProductionBuild } from "@/lib/is-static-build"
import { SYSTEM_USER_ID } from "@/lib/movie-ingestion"
import {
  getPerformancesByLookup,
  type EnrichedPerformance,
} from "@/lib/performances-by-lookup"
import { LEGENDARY_PERFORMANCE_TARGETS } from "@/lib/performances-page-targets"
import {
  DAILY_RAIL_COUNT,
  pickDailySlice,
  popularRightNowTargets,
  recentFavoritesTargets,
  secondsUntilNextUtcMidnight,
  utcDateKey,
} from "@/lib/daily-rail-picks"

export type LandingRailsPayload = {
  dateKey: string
  popular: EnrichedPerformance[]
  legendary: EnrichedPerformance[]
  recent: EnrichedPerformance[]
}

type CatalogLeadRow = {
  id: string
  actorId: string
  movieId: string
  character: string | null
  actorName: string
  actorImageUrl: string | null
  actorSlug: string | null
  movieTitle: string
  movieYear: number
  movieSlug: string | null
  posterUrl: string | null
  releaseDate: Date | null
  tmdbRating: number | null
  tmdbVoteCount: number | null
  heat: number
  communityAvg: number | null
  ratingCount: number
}

function toEnriched(row: CatalogLeadRow): EnrichedPerformance {
  return {
    id: row.id,
    actorId: row.actorId,
    movieId: row.movieId,
    character: row.character,
    actor: {
      id: row.actorId,
      name: row.actorName,
      imageUrl: row.actorImageUrl,
      slug: row.actorSlug,
    },
    movie: {
      id: row.movieId,
      title: row.movieTitle,
      year: row.movieYear,
      slug: row.movieSlug,
      posterUrl: row.posterUrl,
      releaseDate: row.releaseDate,
    },
    averageRating: row.communityAvg,
    ratingCount: row.ratingCount,
  }
}

function lookupTargetsFrom(
  list: Array<{ actor: string; movie: string; year?: number }>,
) {
  return list.map(({ actor, movie, year }) => ({ actor, movie, year }))
}

async function padWithLookup(
  rows: EnrichedPerformance[],
  targets: Array<{ actor: string; movie: string; year?: number }>,
  needed: number,
): Promise<EnrichedPerformance[]> {
  if (rows.length >= needed) return rows.slice(0, needed)
  const seen = new Set(
    rows
      .map((p) =>
        p.actor?.name && p.movie?.title
          ? `${p.actor.name.toLowerCase()}:${p.movie.title.toLowerCase()}`
          : "",
      )
      .filter(Boolean),
  )
  const missing = targets.filter(
    (t) => !seen.has(`${t.actor.toLowerCase()}:${t.movie.toLowerCase()}`),
  )
  if (missing.length === 0) return rows
  try {
    const extra = await getPerformancesByLookup(missing)
    for (const p of extra) {
      if (rows.length >= needed) break
      const key =
        p.actor?.name && p.movie?.title
          ? `${p.actor.name.toLowerCase()}:${p.movie.title.toLowerCase()}`
          : ""
      if (!key || seen.has(key)) continue
      seen.add(key)
      rows.push(p)
    }
  } catch {
    /* keep what we have */
  }
  return rows.slice(0, needed)
}

async function loadCatalogLeads(kind: "popular" | "recent"): Promise<CatalogLeadRow[]> {
  const heatSince = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)
  const windowSql =
    kind === "popular"
      ? Prisma.sql`(
          (
            m."releaseDate" IS NOT NULL
            AND m."releaseDate" <= CURRENT_DATE
            AND m."releaseDate" >= CURRENT_DATE - INTERVAL '14 months'
            AND COALESCE(m."tmdbVoteCount", 0) >= 400
          )
          OR heat.cnt >= 2
        )`
      : Prisma.sql`(
          m."releaseDate" IS NOT NULL
          AND m."releaseDate" <= CURRENT_DATE - INTERVAL '14 days'
          AND m."releaseDate" >= CURRENT_DATE - INTERVAL '42 months'
          AND COALESCE(m."tmdbVoteCount", 0) >= 300
          AND (
            m."tmdbRating" >= 7.0
            OR community.avg_score >= 7.4
          )
        )`

  return prisma.$queryRaw<CatalogLeadRow[]>`
    SELECT *
    FROM (
      SELECT DISTINCT ON (p."movieId")
        p.id,
        p."actorId",
        p."movieId",
        p.character,
        a.name AS "actorName",
        a."imageUrl" AS "actorImageUrl",
        a.slug AS "actorSlug",
        m.title AS "movieTitle",
        m.year AS "movieYear",
        m.slug AS "movieSlug",
        m."posterUrl" AS "posterUrl",
        m."releaseDate" AS "releaseDate",
        m."tmdbRating" AS "tmdbRating",
        m."tmdbVoteCount" AS "tmdbVoteCount",
        COALESCE(heat.cnt, 0)::int AS heat,
        community.avg_score AS "communityAvg",
        COALESCE(community.rating_count, 0)::int AS "ratingCount"
      FROM "Performance" p
      JOIN "Actor" a ON a.id = p."actorId"
      JOIN "Movie" m ON m.id = p."movieId"
      LEFT JOIN (
        SELECT r."actorId", r."movieId", COUNT(*)::int AS cnt
        FROM "Rating" r
        WHERE r."createdAt" >= ${heatSince}
        GROUP BY r."actorId", r."movieId"
      ) heat ON heat."actorId" = p."actorId" AND heat."movieId" = p."movieId"
      LEFT JOIN (
        SELECT
          r."actorId",
          r."movieId",
          AVG(
            (
              r."emotionalRangeDepth" +
              r."characterBelievability" +
              r."technicalSkill" +
              r."screenPresence" +
              r."chemistryInteraction"
            ) / 5.0
          ) AS avg_score,
          COUNT(*)::int AS rating_count
        FROM "Rating" r
        GROUP BY r."actorId", r."movieId"
      ) community ON community."actorId" = p."actorId" AND community."movieId" = p."movieId"
      WHERE p."userId" = ${SYSTEM_USER_ID}
        AND p.tier = 'LEAD'
        AND NOT m."isFeaturette"
        AND m."posterUrl" IS NOT NULL
        AND a.name IS NOT NULL
        AND m.title IS NOT NULL
        AND ${windowSql}
      ORDER BY p."movieId", p."order" ASC NULLS LAST
    ) leads
    ORDER BY
      ${
        kind === "popular"
          ? Prisma.sql`leads.heat DESC, leads."releaseDate" DESC NULLS LAST, leads."tmdbVoteCount" DESC NULLS LAST`
          : Prisma.sql`leads."communityAvg" DESC NULLS LAST, leads."tmdbRating" DESC NULLS LAST, leads."tmdbVoteCount" DESC NULLS LAST`
      }
    LIMIT 48
  `
}

function scorePopular(row: CatalogLeadRow, now: Date): number {
  const release = row.releaseDate ? new Date(row.releaseDate).getTime() : 0
  const daysSinceRelease = release
    ? Math.max(0, (now.getTime() - release) / 86_400_000)
    : 400
  const recency = Math.max(0, 180 - daysSinceRelease)
  const votes = Math.min((row.tmdbVoteCount ?? 0) / 500, 40)
  return row.heat * 50 + recency + votes
}

function scoreRecent(row: CatalogLeadRow): number {
  const quality = row.communityAvg ?? row.tmdbRating ?? 0
  return quality * 10 + Math.min(row.ratingCount, 20)
}

async function pickFromCatalog(
  kind: "popular" | "recent",
  now: Date,
  exclude?: { actors: Set<string>; movies: Set<string> },
): Promise<EnrichedPerformance[]> {
  let rows: CatalogLeadRow[]
  try {
    rows = await loadCatalogLeads(kind)
  } catch {
    return []
  }
  const scored = rows
    .slice()
    .sort((a, b) =>
      kind === "popular"
        ? scorePopular(b, now) - scorePopular(a, now)
        : scoreRecent(b) - scoreRecent(a),
    )
  const picked = pickDailySlice(scored, {
    seed: `${kind}:${utcDateKey(now)}`,
    count: DAILY_RAIL_COUNT,
    actorKey: (r) => r.actorName,
    movieKey: (r) => r.movieTitle,
    excludeActors: exclude?.actors,
    excludeMovies: exclude?.movies,
  })
  return picked.map(toEnriched)
}

async function computeLandingRails(now: Date): Promise<LandingRailsPayload> {
  const dateKey = utcDateKey(now)
  const editorialPopular = popularRightNowTargets(now)
  const editorialRecent = recentFavoritesTargets(now)

  const [catalogPopular, legendary] = await Promise.all([
    pickFromCatalog("popular", now),
    getPerformancesByLookup(lookupTargetsFrom(LEGENDARY_PERFORMANCE_TARGETS)),
  ])

  const popular = await padWithLookup(
    catalogPopular,
    lookupTargetsFrom(editorialPopular),
    DAILY_RAIL_COUNT,
  )

  const excludeActors = new Set(
    popular.map((p) => p.actor?.name ?? "").filter(Boolean),
  )
  const excludeMovies = new Set(
    popular.map((p) => p.movie?.title ?? "").filter(Boolean),
  )

  const catalogRecent = await pickFromCatalog("recent", now, {
    actors: excludeActors,
    movies: excludeMovies,
  })
  const recent = await padWithLookup(
    catalogRecent,
    lookupTargetsFrom(editorialRecent),
    DAILY_RAIL_COUNT,
  )

  return { dateKey, popular, legendary, recent }
}

export async function loadLandingRails(
  now = new Date(),
): Promise<LandingRailsPayload> {
  const empty: LandingRailsPayload = {
    dateKey: utcDateKey(now),
    popular: [],
    legendary: [],
    recent: [],
  }
  if (isStaticProductionBuild()) return empty

  const dateKey = utcDateKey(now)
  const cacheKey = makeCacheKey("landing:daily-rails", [dateKey])
  const cached = await cacheGet<LandingRailsPayload>(cacheKey)
  if (cached?.dateKey === dateKey) return cached

  try {
    const payload = await computeLandingRails(now)
    await cacheSet(cacheKey, payload, secondsUntilNextUtcMidnight(now))
    return payload
  } catch {
    return empty
  }
}
