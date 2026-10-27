/**
 * Site-wide qualified-traffic funnel for /admin?tab=traffic.
 *
 * Trust for decisions: engaged humans (distinct ipHash on qualified_visit),
 * qualified_visit counts, ratings, signups.
 * Noisy / directional only: raw PageView totals, Umami “visitors” (often includes
 * zero-dwell headless Chrome). Human pageviews still use isLikelyBot=false but
 * can include spoofed browsers that never qualify.
 *
 * Umami reconciliation (same calendar window):
 * - Compare Umami pageviews ≈ first-party PageView rows (both fire on root layout).
 * - Prefer engaged humans + qualified_visit over Umami unique visitors.
 * - Prefer Rating / User signup counts over any analytics “conversion” estimate.
 */

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/admin/cache"
import type { PageViewAnalyticsDays } from "@/lib/admin/getPageViewAnalytics"
import {
  resolveInternalUserIds,
  sqlUserIdNotInternal,
} from "@/lib/admin/internal-users"

export type QualifiedTrafficChannelRow = {
  key: string
  /** Distinct ipHash on non-bot qualified_visit for this channel. */
  engagedHumans: number
  humanPageviews: number
  qualifiedVisits: number
  ratings: number
  signups: number
  repeatRaters: number
}

export type QualifiedTrafficMetrics = {
  days: PageViewAnalyticsDays
  /**
   * Reliable humans: COUNT(DISTINCT ipHash) on non-bot qualified_visit
   * in the window (engagement-proven, not isLikelyBot=false alone).
   */
  engagedHumans: number
  humanPageviews: number
  /** PageView rows with isLikelyBot = true in the same window. */
  botPageviews: number
  /**
   * Non-bot ProductEvent qualified_visit rows (server gates: pageview match,
   * dedupe, bot parity with matching PageView).
   */
  qualifiedVisits: number
  ratings: number
  signups: number
  repeatRaters: number
  /**
   * qualifiedVisits / humanPageviews, capped at 1.
   * null when humanPageviews is 0, or when qualified exceeds human (show n/a).
   */
  humanToQualifiedRatio: number | null
  /** True when qualifiedVisits > humanPageviews (ratio shown as n/a). */
  humanToQualifiedExceeded: boolean
  /** ratings / qualifiedVisits when qualifiedVisits > 0; else null */
  qualifiedToRatingRatio: number | null
  /**
   * Share of human pageviews not matched by a qualified_visit count
   * (max(0, human − qualified) / human). Bot-suspicion indicator, not a bot count.
   */
  humanPageviewsWithoutQualifiedShare: number | null
  bySource: QualifiedTrafficChannelRow[]
  byCampaign: QualifiedTrafficChannelRow[]
}

function toNumber(value: bigint | number | null | undefined): number {
  if (typeof value === "bigint") return Number(value)
  return value ?? 0
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return numerator / denominator
}

function intervalForDays(days: PageViewAnalyticsDays): Prisma.Sql {
  if (days === 1) return Prisma.raw(`INTERVAL '24 hours'`)
  if (days === 30) return Prisma.raw(`INTERVAL '29 days'`)
  return Prisma.raw(`INTERVAL '6 days'`)
}

function emptyMetrics(days: PageViewAnalyticsDays): QualifiedTrafficMetrics {
  return {
    days,
    engagedHumans: 0,
    humanPageviews: 0,
    botPageviews: 0,
    qualifiedVisits: 0,
    ratings: 0,
    signups: 0,
    repeatRaters: 0,
    humanToQualifiedRatio: null,
    humanToQualifiedExceeded: false,
    qualifiedToRatingRatio: null,
    humanPageviewsWithoutQualifiedShare: null,
    bySource: [],
    byCampaign: [],
  }
}

type CountRow = { count: bigint | number }
type KeyCountRow = { key: string; count: bigint | number }
type KeyUserRow = { key: string; signups: bigint | number; repeatRaters: bigint | number }

/**
 * Pure helper: distinct ipHash count (engaged humans), not event row count.
 * Exported for unit tests.
 */
export function countDistinctEngagedHumans(
  events: Array<{ ipHash: string }>,
): number {
  const set = new Set<string>()
  for (const e of events) {
    const ip = e.ipHash?.trim()
    if (ip) set.add(ip)
  }
  return set.size
}

/**
 * Merge channel breakdown maps. Exported for unit tests.
 */
export function mergeQualifiedTrafficChannels(
  engaged: KeyCountRow[],
  human: KeyCountRow[],
  qualified: KeyCountRow[],
  ratings: KeyCountRow[],
  users: KeyUserRow[],
): QualifiedTrafficChannelRow[] {
  const map = new Map<string, QualifiedTrafficChannelRow>()
  const ensure = (key: string) => {
    const k = key || "(none)"
    let row = map.get(k)
    if (!row) {
      row = {
        key: k,
        engagedHumans: 0,
        humanPageviews: 0,
        qualifiedVisits: 0,
        ratings: 0,
        signups: 0,
        repeatRaters: 0,
      }
      map.set(k, row)
    }
    return row
  }
  for (const r of engaged) ensure(r.key).engagedHumans = toNumber(r.count)
  for (const r of human) ensure(r.key).humanPageviews = toNumber(r.count)
  for (const r of qualified) ensure(r.key).qualifiedVisits = toNumber(r.count)
  for (const r of ratings) ensure(r.key).ratings = toNumber(r.count)
  for (const r of users) {
    const row = ensure(r.key)
    row.signups = toNumber(r.signups)
    row.repeatRaters = toNumber(r.repeatRaters)
  }
  return [...map.values()].sort(
    (a, b) =>
      b.engagedHumans - a.engagedHumans ||
      b.qualifiedVisits - a.qualifiedVisits ||
      b.ratings - a.ratings ||
      b.humanPageviews - a.humanPageviews,
  )
}

/**
 * Pure helpers exported for unit tests (no DB).
 */
export function computeQualifiedTrafficRatios(input: {
  humanPageviews: number
  qualifiedVisits: number
  ratings: number
}): Pick<
  QualifiedTrafficMetrics,
  | "humanToQualifiedRatio"
  | "humanToQualifiedExceeded"
  | "qualifiedToRatingRatio"
  | "humanPageviewsWithoutQualifiedShare"
> {
  const { humanPageviews, qualifiedVisits, ratings } = input
  const exceeded = humanPageviews > 0 && qualifiedVisits > humanPageviews
  return {
    // Cap at 100%; if numerator somehow exceeds denominator, expose n/a instead.
    humanToQualifiedRatio: exceeded
      ? null
      : humanPageviews > 0
        ? Math.min(1, qualifiedVisits / humanPageviews)
        : null,
    humanToQualifiedExceeded: exceeded,
    qualifiedToRatingRatio: ratio(ratings, qualifiedVisits),
    humanPageviewsWithoutQualifiedShare:
      humanPageviews > 0
        ? Math.max(0, humanPageviews - qualifiedVisits) / humanPageviews
        : null,
  }
}

export async function getQualifiedTrafficMetrics(
  days: PageViewAnalyticsDays = 7,
): Promise<QualifiedTrafficMetrics> {
  const internalIds = await resolveInternalUserIds()
  const cacheKey = `admin:qualified-traffic:v4:${days}:${internalIds.join(",")}`
  const cached = getCache<QualifiedTrafficMetrics>(cacheKey)
  if (cached) return cached

  const interval = intervalForDays(days)
  const excl = sqlUserIdNotInternal(internalIds)

  try {
    const [
      engagedRows,
      humanRows,
      botRows,
      qualifiedRows,
      ratingRows,
      signupRows,
      repeatRows,
      engagedBySource,
      humanBySource,
      qualifiedBySource,
      ratingsBySource,
      usersBySource,
      engagedByCampaign,
      humanByCampaign,
      qualifiedByCampaign,
      ratingsByCampaign,
      usersByCampaign,
    ] = await Promise.all([
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(DISTINCT "ipHash")::bigint AS count
        FROM "ProductEvent"
        WHERE "name" = 'qualified_visit'
          AND "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND ${excl}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND "path" NOT LIKE '/admin%'
          AND ${excl}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = true
          AND "createdAt" >= NOW() - ${interval}
          AND "path" NOT LIKE '/admin%'
          AND ${excl}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "ProductEvent"
        WHERE "name" = 'qualified_visit'
          AND "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND ${excl}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "Rating"
        WHERE "createdAt" >= NOW() - ${interval}
          AND ${excl}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "User"
        WHERE "createdAt" >= NOW() - ${interval}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "User" u
        WHERE u."createdAt" >= NOW() - ${interval}
          AND (
            SELECT COUNT(*) FROM "Rating" r WHERE r."userId" = u."id"
          ) >= 2
      `),
      prisma.$queryRaw<KeyCountRow[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM("utmSource"), ''), '(none)') AS key,
               COUNT(DISTINCT "ipHash")::bigint AS count
        FROM "ProductEvent"
        WHERE "name" = 'qualified_visit'
          AND "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND ${excl}
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 25
      `),
      prisma.$queryRaw<KeyCountRow[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM("utmSource"), ''), '(none)') AS key,
               COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND "path" NOT LIKE '/admin%'
          AND ${excl}
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 25
      `),
      prisma.$queryRaw<KeyCountRow[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM("utmSource"), ''), '(none)') AS key,
               COUNT(*)::bigint AS count
        FROM "ProductEvent"
        WHERE "name" = 'qualified_visit'
          AND "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND ${excl}
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 25
      `),
      prisma.$queryRaw<KeyCountRow[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM("utmSource"), ''), '(none)') AS key,
               COUNT(*)::bigint AS count
        FROM "Rating"
        WHERE "createdAt" >= NOW() - ${interval}
          AND ${excl}
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 25
      `),
      prisma.$queryRaw<KeyUserRow[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM(u."signupUtmSource"), ''), '(none)') AS key,
               COUNT(*)::bigint AS signups,
               COUNT(*) FILTER (
                 WHERE (
                   SELECT COUNT(*) FROM "Rating" r WHERE r."userId" = u."id"
                 ) >= 2
               )::bigint AS "repeatRaters"
        FROM "User" u
        WHERE u."createdAt" >= NOW() - ${interval}
        GROUP BY 1
      `),
      prisma.$queryRaw<KeyCountRow[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM("utmCampaign"), ''), '(none)') AS key,
               COUNT(DISTINCT "ipHash")::bigint AS count
        FROM "ProductEvent"
        WHERE "name" = 'qualified_visit'
          AND "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND ${excl}
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 25
      `),
      prisma.$queryRaw<KeyCountRow[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM("utmCampaign"), ''), '(none)') AS key,
               COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND "path" NOT LIKE '/admin%'
          AND ${excl}
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 25
      `),
      prisma.$queryRaw<KeyCountRow[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM("utmCampaign"), ''), '(none)') AS key,
               COUNT(*)::bigint AS count
        FROM "ProductEvent"
        WHERE "name" = 'qualified_visit'
          AND "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND ${excl}
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 25
      `),
      prisma.$queryRaw<KeyCountRow[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM("utmCampaign"), ''), '(none)') AS key,
               COUNT(*)::bigint AS count
        FROM "Rating"
        WHERE "createdAt" >= NOW() - ${interval}
          AND ${excl}
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 25
      `),
      prisma.$queryRaw<KeyUserRow[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM(u."signupUtmCampaign"), ''), '(none)') AS key,
               COUNT(*)::bigint AS signups,
               COUNT(*) FILTER (
                 WHERE (
                   SELECT COUNT(*) FROM "Rating" r WHERE r."userId" = u."id"
                 ) >= 2
               )::bigint AS "repeatRaters"
        FROM "User" u
        WHERE u."createdAt" >= NOW() - ${interval}
        GROUP BY 1
      `),
    ])

    const engagedHumans = toNumber(engagedRows[0]?.count)
    const humanPageviews = toNumber(humanRows[0]?.count)
    const botPageviews = toNumber(botRows[0]?.count)
    const qualifiedVisits = toNumber(qualifiedRows[0]?.count)
    const ratings = toNumber(ratingRows[0]?.count)
    const signups = toNumber(signupRows[0]?.count)
    const repeatRaters = toNumber(repeatRows[0]?.count)
    const ratios = computeQualifiedTrafficRatios({
      humanPageviews,
      qualifiedVisits,
      ratings,
    })

    const data: QualifiedTrafficMetrics = {
      days,
      engagedHumans,
      humanPageviews,
      botPageviews,
      qualifiedVisits,
      ratings,
      signups,
      repeatRaters,
      ...ratios,
      bySource: mergeQualifiedTrafficChannels(
        engagedBySource,
        humanBySource,
        qualifiedBySource,
        ratingsBySource,
        usersBySource,
      ),
      byCampaign: mergeQualifiedTrafficChannels(
        engagedByCampaign,
        humanByCampaign,
        qualifiedByCampaign,
        ratingsByCampaign,
        usersByCampaign,
      ),
    }

    setCache(cacheKey, data, 30_000)
    return data
  } catch (error) {
    console.error("Admin query failed getQualifiedTrafficMetrics", error)
    return emptyMetrics(days)
  }
}
