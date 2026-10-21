/**
 * Site-wide qualified-traffic funnel for /admin?tab=traffic.
 *
 * Trust for decisions: ratings, signups, qualified_visit counts.
 * Noisy / directional only: raw PageView totals, Umami “visitors” (often includes
 * zero-dwell headless Chrome). Human pageviews still use isLikelyBot=false but
 * can include spoofed browsers that never qualify.
 *
 * Umami reconciliation (same calendar window):
 * - Compare Umami pageviews ≈ first-party PageView rows (both fire on root layout).
 * - Prefer first-party human + qualified_visit over Umami unique visitors.
 * - Prefer Rating / User signup counts over any analytics “conversion” estimate.
 */

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/admin/cache"
import type { PageViewAnalyticsDays } from "@/lib/admin/getPageViewAnalytics"

export type QualifiedTrafficChannelRow = {
  key: string
  humanPageviews: number
  qualifiedVisits: number
  ratings: number
  signups: number
  repeatRaters: number
}

export type QualifiedTrafficMetrics = {
  days: PageViewAnalyticsDays
  humanPageviews: number
  qualifiedVisits: number
  ratings: number
  signups: number
  repeatRaters: number
  /** qualifiedVisits / humanPageviews when humanPageviews > 0; else null */
  humanToQualifiedRatio: number | null
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
    humanPageviews: 0,
    qualifiedVisits: 0,
    ratings: 0,
    signups: 0,
    repeatRaters: 0,
    humanToQualifiedRatio: null,
    qualifiedToRatingRatio: null,
    humanPageviewsWithoutQualifiedShare: null,
    bySource: [],
    byCampaign: [],
  }
}

type CountRow = { count: bigint | number }
type KeyCountRow = { key: string; count: bigint | number }
type KeyUserRow = { key: string; signups: bigint | number; repeatRaters: bigint | number }

function mergeChannelMaps(
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
      b.humanPageviews - a.humanPageviews ||
      b.qualifiedVisits - a.qualifiedVisits ||
      b.ratings - a.ratings,
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
  "humanToQualifiedRatio" | "qualifiedToRatingRatio" | "humanPageviewsWithoutQualifiedShare"
> {
  const { humanPageviews, qualifiedVisits, ratings } = input
  return {
    humanToQualifiedRatio: ratio(qualifiedVisits, humanPageviews),
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
  const cacheKey = `admin:qualified-traffic:${days}`
  const cached = getCache<QualifiedTrafficMetrics>(cacheKey)
  if (cached) return cached

  const interval = intervalForDays(days)

  try {
    const [
      humanRows,
      qualifiedRows,
      ratingRows,
      signupRows,
      repeatRows,
      humanBySource,
      qualifiedBySource,
      ratingsBySource,
      usersBySource,
      humanByCampaign,
      qualifiedByCampaign,
      ratingsByCampaign,
      usersByCampaign,
    ] = await Promise.all([
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "ProductEvent"
        WHERE "name" = 'qualified_visit'
          AND "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "Rating"
        WHERE "createdAt" >= NOW() - ${interval}
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
               COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
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
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 25
      `),
      prisma.$queryRaw<KeyCountRow[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM("utmSource"), ''), '(none)') AS key,
               COUNT(*)::bigint AS count
        FROM "Rating"
        WHERE "createdAt" >= NOW() - ${interval}
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
               COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
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
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 25
      `),
      prisma.$queryRaw<KeyCountRow[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM("utmCampaign"), ''), '(none)') AS key,
               COUNT(*)::bigint AS count
        FROM "Rating"
        WHERE "createdAt" >= NOW() - ${interval}
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

    const humanPageviews = toNumber(humanRows[0]?.count)
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
      humanPageviews,
      qualifiedVisits,
      ratings,
      signups,
      repeatRaters,
      ...ratios,
      bySource: mergeChannelMaps(
        humanBySource,
        qualifiedBySource,
        ratingsBySource,
        usersBySource,
      ),
      byCampaign: mergeChannelMaps(
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
