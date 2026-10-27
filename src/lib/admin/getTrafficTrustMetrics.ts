/**
 * Session-based, three-way-trust traffic metrics for /admin?tab=traffic.
 *
 * Trust per pageview (never "human by default"):
 *   BOT     — isLikelyBot (UA, header mismatch, burst, crawl, verified bot, reclassifier)
 *   HUMAN   — positive proof: engaged (qualified_visit write-back), signed-in,
 *             ≥5s dwell + interaction, or the same visitor proved human elsewhere
 *             in the window (rating, qualified_visit, signup…). Legacy rows without
 *             a visitorId fall back to IP-level proof.
 *   UNKNOWN — JS ran, nothing proved either way (zero-dwell spoofed Chrome lives here).
 *
 * Sessions come from the rolling 30-minute `ar_sid` cookie. Session trust is
 * BOT if any pageview is bot, else HUMAN if any pageview is human, else UNKNOWN.
 *
 * Engaged session (GA4 definition): engaged pageview, or ≥2 pageviews, or ≥10s.
 * Bounce (classic): exactly one pageview and no engaged pageview.
 */

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/admin/cache"
import type { PageViewAnalyticsDays } from "@/lib/admin/getPageViewAnalytics"
import {
  resolveInternalUserIds,
  sqlUserIdNotInternal,
} from "@/lib/admin/internal-users"

export type TrustLevel = "HUMAN" | "UNKNOWN" | "BOT"

export type TrustBucket = {
  pageviews: number
  /** Distinct visitors (ar_vid; legacy rows fall back to ipHash). */
  visitors: number
  sessions: number
  engagedSessions: number
  bouncedSessions: number
  avgSessionDurationMs: number | null
  avgPagesPerSession: number | null
}

export type TrafficTrustMetrics = {
  days: PageViewAnalyticsDays
  human: TrustBucket
  unknown: TrustBucket
  bot: TrustBucket
  /** Non-bot pageviews that predate session tracking (no sessionId). */
  legacyNonBotPageviews: number
  /** HUMAN sessions: engaged / sessions. */
  humanEngagementRate: number | null
  /** HUMAN sessions: bounced / sessions. */
  humanBounceRate: number | null
  /** HUMAN + UNKNOWN sessions: bounced / sessions (what GA-style tools would show). */
  nonBotBounceRate: number | null
  /** Share of non-bot pageviews that are UNKNOWN. */
  unknownShareOfNonBot: number | null
  botReasons: Array<{ reason: string; count: number }>
  humanCountries: Array<{ country: string; count: number }>
  humanTopPages: Array<{ path: string; count: number }>
  humanTopReferrers: Array<{ domain: string; count: number }>
  /** Operator accounts excluded via INTERNAL_USER_IDS + ADMIN_EMAIL. */
  internalUsersExcluded: number
}

type TrustRow = {
  trust: string
  pageviews: bigint | number
  visitors: bigint | number
}
type SessionRow = {
  trust: string
  sessions: bigint | number
  engaged_sessions: bigint | number
  bounced_sessions: bigint | number
  avg_duration_ms: unknown
  avg_pages: unknown
}
type CountRow = { count: bigint | number }
type NamedCountRow = { name: string | null; count: bigint | number }

function toNumber(v: unknown): number {
  if (v == null) return 0
  if (typeof v === "number") return v
  if (typeof v === "bigint") return Number(v)
  // Postgres numeric (AVG, EXTRACT) arrives as a string or Prisma Decimal object.
  const n = Number(String(v))
  return Number.isFinite(n) ? n : 0
}

function emptyBucket(): TrustBucket {
  return {
    pageviews: 0,
    visitors: 0,
    sessions: 0,
    engagedSessions: 0,
    bouncedSessions: 0,
    avgSessionDurationMs: null,
    avgPagesPerSession: null,
  }
}

function emptyMetrics(days: PageViewAnalyticsDays): TrafficTrustMetrics {
  return {
    days,
    human: emptyBucket(),
    unknown: emptyBucket(),
    bot: emptyBucket(),
    legacyNonBotPageviews: 0,
    humanEngagementRate: null,
    humanBounceRate: null,
    nonBotBounceRate: null,
    unknownShareOfNonBot: null,
    botReasons: [],
    humanCountries: [],
    humanTopPages: [],
    humanTopReferrers: [],
    internalUsersExcluded: 0,
  }
}

function intervalForDays(days: PageViewAnalyticsDays): Prisma.Sql {
  if (days === 1) return Prisma.raw(`INTERVAL '24 hours'`)
  if (days === 30) return Prisma.raw(`INTERVAL '29 days'`)
  return Prisma.raw(`INTERVAL '6 days'`)
}

/** Pure: ratio helper exported for tests. */
export function safeRatio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return numerator / denominator
}

/** Pure: derive the headline rates from buckets. Exported for tests. */
export function computeTrustRates(input: {
  human: TrustBucket
  unknown: TrustBucket
}): Pick<
  TrafficTrustMetrics,
  "humanEngagementRate" | "humanBounceRate" | "nonBotBounceRate" | "unknownShareOfNonBot"
> {
  const { human, unknown } = input
  const nonBotSessions = human.sessions + unknown.sessions
  const nonBotPageviews = human.pageviews + unknown.pageviews
  return {
    humanEngagementRate: safeRatio(human.engagedSessions, human.sessions),
    humanBounceRate: safeRatio(human.bouncedSessions, human.sessions),
    nonBotBounceRate: safeRatio(
      human.bouncedSessions + unknown.bouncedSessions,
      nonBotSessions,
    ),
    unknownShareOfNonBot: safeRatio(unknown.pageviews, nonBotPageviews),
  }
}

/** Product events that count as positive human proof for a visitor / IP. */
const PROOF_EVENT_NAMES = Prisma.raw(
  `('qualified_visit','rating_submitted','signup_started','hub_rate_click','faceoff_vote_submitted','search_used')`,
)

/** Shared CTE prefix: windowed pageviews (no /admin) classified into trust levels. */
function classifiedCte(interval: Prisma.Sql, internalIds: string[]): Prisma.Sql {
  const exclPv = sqlUserIdNotInternal(internalIds)
  const exclPe = sqlUserIdNotInternal(internalIds)
  return Prisma.sql`
    WITH w AS (
      SELECT "id", "path", "referrer", "userId", "ipHash", "visitorId", "sessionId",
             "isLikelyBot", "botReason", "engaged", "dwellMs", "interaction", "country", "createdAt"
      FROM "PageView"
      WHERE "createdAt" >= NOW() - ${interval}
        AND "path" NOT LIKE '/admin%'
        AND ${exclPv}
    ),
    -- Cookie-bound only. Do NOT promote by ipHash: CGNAT + crawl fleets share IPs
    -- with one real qualified_visit and would turn thousands of hop pageviews into "Human".
    proven_visitors AS (
      SELECT DISTINCT "visitorId" FROM w
      WHERE "visitorId" IS NOT NULL AND "isLikelyBot" = false
        AND ("engaged" = true OR "userId" IS NOT NULL
             OR ("dwellMs" >= 5000 AND "interaction" IS NOT NULL))
      UNION
      SELECT DISTINCT "visitorId" FROM "ProductEvent"
      WHERE "createdAt" >= NOW() - ${interval}
        AND "visitorId" IS NOT NULL AND "isLikelyBot" = false
        AND "name" IN ${PROOF_EVENT_NAMES}
        AND ${exclPe}
    ),
    classified AS (
      SELECT w.*,
        CASE
          WHEN w."isLikelyBot" THEN 'BOT'
          WHEN w."engaged" = true OR w."userId" IS NOT NULL THEN 'HUMAN'
          WHEN w."dwellMs" >= 5000 AND w."interaction" IS NOT NULL THEN 'HUMAN'
          WHEN w."visitorId" IS NOT NULL
               AND EXISTS (SELECT 1 FROM proven_visitors pv WHERE pv."visitorId" = w."visitorId") THEN 'HUMAN'
          ELSE 'UNKNOWN'
        END AS trust
      FROM w
    )
  `
}

export async function getTrafficTrustMetrics(
  days: PageViewAnalyticsDays = 7,
): Promise<TrafficTrustMetrics> {
  const internalIds = await resolveInternalUserIds()
  const cacheKey = `admin:traffic-trust:v3:${days}:${internalIds.join(",")}`
  const cached = getCache<TrafficTrustMetrics>(cacheKey)
  if (cached) return cached

  const interval = intervalForDays(days)
  const cte = classifiedCte(interval, internalIds)
  const exclPv = sqlUserIdNotInternal(internalIds)

  try {
    const [
      trustRows,
      sessionRows,
      legacyRows,
      reasonRows,
      countryRows,
      pageRows,
      referrerRows,
    ] = await Promise.all([
      prisma.$queryRaw<TrustRow[]>(Prisma.sql`
        ${cte}
        SELECT trust,
               COUNT(*)::bigint AS pageviews,
               COUNT(DISTINCT COALESCE("visitorId", 'ip:' || "ipHash"))::bigint AS visitors
        FROM classified
        GROUP BY trust
      `),
      prisma.$queryRaw<SessionRow[]>(Prisma.sql`
        ${cte},
        sessions AS (
          SELECT "sessionId",
                 COUNT(*)::int AS pageviews,
                 BOOL_OR(trust = 'BOT') AS any_bot,
                 BOOL_OR(trust = 'HUMAN') AS any_human,
                 BOOL_OR("engaged" OR ("dwellMs" >= 5000 AND "interaction" IS NOT NULL)) AS any_engaged,
                 EXTRACT(EPOCH FROM (MAX("createdAt") - MIN("createdAt"))) * 1000 AS span_ms,
                 COALESCE(SUM("dwellMs"), 0) AS dwell_ms
          FROM classified
          WHERE "sessionId" IS NOT NULL
          GROUP BY "sessionId"
        ),
        scored AS (
          SELECT *,
                 CASE WHEN any_bot THEN 'BOT' WHEN any_human THEN 'HUMAN' ELSE 'UNKNOWN' END AS trust,
                 GREATEST(span_ms, dwell_ms) AS duration_ms
          FROM sessions
        )
        SELECT trust,
               COUNT(*)::bigint AS sessions,
               COUNT(*) FILTER (
                 WHERE any_engaged OR pageviews >= 2 OR duration_ms >= 10000
               )::bigint AS engaged_sessions,
               COUNT(*) FILTER (WHERE pageviews = 1 AND NOT any_engaged)::bigint AS bounced_sessions,
               AVG(duration_ms) AS avg_duration_ms,
               AVG(pageviews) AS avg_pages
        FROM scored
        GROUP BY trust
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "createdAt" >= NOW() - ${interval}
          AND "path" NOT LIKE '/admin%'
          AND "isLikelyBot" = false
          AND "sessionId" IS NULL
          AND ${exclPv}
      `),
      prisma.$queryRaw<NamedCountRow[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM("botReason"), ''), '(unspecified / legacy)') AS name,
               COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "createdAt" >= NOW() - ${interval}
          AND "isLikelyBot" = true
          AND ${exclPv}
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 12
      `),
      prisma.$queryRaw<NamedCountRow[]>(Prisma.sql`
        ${cte}
        SELECT COALESCE("country", '(unknown)') AS name, COUNT(*)::bigint AS count
        FROM classified
        WHERE trust = 'HUMAN'
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 10
      `),
      prisma.$queryRaw<NamedCountRow[]>(Prisma.sql`
        ${cte}
        SELECT "path" AS name, COUNT(*)::bigint AS count
        FROM classified
        WHERE trust = 'HUMAN'
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 15
      `),
      prisma.$queryRaw<NamedCountRow[]>(Prisma.sql`
        ${cte}
        SELECT
          CASE
            WHEN "referrer" IS NULL OR BTRIM("referrer") = '' THEN '(direct)'
            ELSE COALESCE(
              NULLIF(REGEXP_REPLACE(SUBSTRING("referrer" FROM '://([^/?#]+)'), '^www\\.', ''), ''),
              '(direct)'
            )
          END AS name,
          COUNT(*)::bigint AS count
        FROM classified
        WHERE trust = 'HUMAN'
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 12
      `),
    ])

    const buckets: Record<TrustLevel, TrustBucket> = {
      HUMAN: emptyBucket(),
      UNKNOWN: emptyBucket(),
      BOT: emptyBucket(),
    }
    for (const row of trustRows) {
      const b = buckets[row.trust as TrustLevel]
      if (!b) continue
      b.pageviews = toNumber(row.pageviews)
      b.visitors = toNumber(row.visitors)
    }
    for (const row of sessionRows) {
      const b = buckets[row.trust as TrustLevel]
      if (!b) continue
      b.sessions = toNumber(row.sessions)
      b.engagedSessions = toNumber(row.engaged_sessions)
      b.bouncedSessions = toNumber(row.bounced_sessions)
      b.avgSessionDurationMs = row.avg_duration_ms == null ? null : toNumber(row.avg_duration_ms)
      b.avgPagesPerSession = row.avg_pages == null ? null : toNumber(row.avg_pages)
    }

    const data: TrafficTrustMetrics = {
      days,
      human: buckets.HUMAN,
      unknown: buckets.UNKNOWN,
      bot: buckets.BOT,
      legacyNonBotPageviews: toNumber(legacyRows[0]?.count),
      ...computeTrustRates({ human: buckets.HUMAN, unknown: buckets.UNKNOWN }),
      botReasons: reasonRows.map((r) => ({
        reason: r.name ?? "(unspecified / legacy)",
        count: toNumber(r.count),
      })),
      humanCountries: countryRows.map((r) => ({
        country: r.name ?? "(unknown)",
        count: toNumber(r.count),
      })),
      humanTopPages: pageRows.map((r) => ({
        path: r.name ?? "",
        count: toNumber(r.count),
      })),
      humanTopReferrers: referrerRows.map((r) => ({
        domain: r.name ?? "(direct)",
        count: toNumber(r.count),
      })),
      internalUsersExcluded: internalIds.length,
    }

    setCache(cacheKey, data, 30_000)
    return data
  } catch (error) {
    console.error("Admin query failed getTrafficTrustMetrics", error)
    return { ...emptyMetrics(days), internalUsersExcluded: internalIds.length }
  }
}
