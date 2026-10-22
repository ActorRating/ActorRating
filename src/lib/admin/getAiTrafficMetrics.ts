import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/admin/cache"
import type { PageViewAnalyticsDays } from "@/lib/admin/getPageViewAnalytics"
import {
  AI_CRAWLER_FAMILIES,
  classifyAiCrawlerFamily,
} from "@/lib/analytics/ai-crawlers"
import { AI_REFERRAL_CHANNEL_KEY } from "@/lib/analytics/ai-referral"

function toNumber(value: bigint | number | null | undefined): number {
  if (typeof value === "bigint") return Number(value)
  return value ?? 0
}

function intervalForDays(days: PageViewAnalyticsDays): Prisma.Sql {
  if (days === 1) return Prisma.raw(`INTERVAL '24 hours'`)
  if (days === 30) return Prisma.raw(`INTERVAL '29 days'`)
  return Prisma.raw(`INTERVAL '6 days'`)
}

/** SQL predicate matching AI referral referrers (mirrors ai-referral.ts). */
export function aiReferralReferrerSql(column = `"referrer"`): Prisma.Sql {
  return Prisma.sql`(
    ${Prisma.raw(column)} ILIKE '%chatgpt.com%'
    OR ${Prisma.raw(column)} ILIKE '%chat.openai.com%'
    OR ${Prisma.raw(column)} ILIKE '%perplexity.ai%'
    OR ${Prisma.raw(column)} ILIKE '%claude.ai%'
    OR ${Prisma.raw(column)} ILIKE '%gemini.google.com%'
    OR ${Prisma.raw(column)} ILIKE '%copilot.microsoft.com%'
    OR ${Prisma.raw(column)} ILIKE '%you.com%'
    OR ${Prisma.raw(column)} ILIKE '%phind.com%'
    OR (
      ${Prisma.raw(column)} ILIKE '%bing.com%'
      AND ${Prisma.raw(column)} ILIKE '%/chat%'
    )
    OR (
      ${Prisma.raw(column)} ILIKE '%duckduckgo.com%'
      AND (
        ${Prisma.raw(column)} ILIKE '%/aichat%'
        OR ${Prisma.raw(column)} ILIKE '%ia=chat%'
      )
    )
  )`
}

export type AiReferralFunnelRow = {
  key: string
  humanPageviews: number
  qualifiedVisits: number
  ratings: number
  signups: number
}

export type AiCrawlerPathRow = { path: string; count: number }

export type AiCrawlerFamilyRow = {
  id: string
  label: string
  unverified?: boolean
  requestCount: number
  topPaths: AiCrawlerPathRow[]
}

export type AiTrafficMetrics = {
  days: PageViewAnalyticsDays
  referral: AiReferralFunnelRow
  crawlers: AiCrawlerFamilyRow[]
  /** Spoofing caveat for the UI. */
  uaSpoofNote: string
}

const UA_SPOOF_NOTE =
  "User-Agent strings can be spoofed; AI crawler counts are directional, not proof of vendor traffic."

export function emptyAiTrafficMetrics(
  days: PageViewAnalyticsDays,
): AiTrafficMetrics {
  return {
    days,
    referral: {
      key: AI_REFERRAL_CHANNEL_KEY,
      humanPageviews: 0,
      qualifiedVisits: 0,
      ratings: 0,
      signups: 0,
    },
    crawlers: AI_CRAWLER_FAMILIES.map((f) => ({
      id: f.id,
      label: f.label,
      unverified: f.unverified,
      requestCount: 0,
      topPaths: [],
    })),
    uaSpoofNote: UA_SPOOF_NOTE,
  }
}

type CountRow = { count: bigint | number }
type UaPathRow = { userAgent: string; path: string; count: bigint | number }

export async function getAiTrafficMetrics(
  days: PageViewAnalyticsDays = 7,
): Promise<AiTrafficMetrics> {
  const cacheKey = `admin:ai-traffic:v1:${days}`
  const cached = getCache<AiTrafficMetrics>(cacheKey)
  if (cached) return cached

  const interval = intervalForDays(days)
  const refPred = aiReferralReferrerSql()

  try {
    const [pvRows, qvRows, ratingRows, signupRows, uaRows] = await Promise.all([
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND ${refPred}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "ProductEvent" e
        WHERE e."name" = 'qualified_visit'
          AND e."isLikelyBot" = false
          AND e."createdAt" >= NOW() - ${interval}
          AND e."ipHash" IN (
            SELECT DISTINCT pv."ipHash"
            FROM "PageView" pv
            WHERE pv."isLikelyBot" = false
              AND pv."createdAt" >= NOW() - ${interval}
              AND ${aiReferralReferrerSql("pv.\"referrer\"")}
          )
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "ProductEvent" e
        WHERE e."name" = 'rating_submitted'
          AND e."createdAt" >= NOW() - ${interval}
          AND e."ipHash" IN (
            SELECT DISTINCT pv."ipHash"
            FROM "PageView" pv
            WHERE pv."isLikelyBot" = false
              AND pv."createdAt" >= NOW() - ${interval}
              AND ${aiReferralReferrerSql("pv.\"referrer\"")}
          )
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "ProductEvent" e
        WHERE e."name" = 'signup_started'
          AND e."createdAt" >= NOW() - ${interval}
          AND e."ipHash" IN (
            SELECT DISTINCT pv."ipHash"
            FROM "PageView" pv
            WHERE pv."isLikelyBot" = false
              AND pv."createdAt" >= NOW() - ${interval}
              AND ${aiReferralReferrerSql("pv.\"referrer\"")}
          )
      `),
      prisma.$queryRaw<UaPathRow[]>(Prisma.sql`
        SELECT "userAgent", "path", COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "createdAt" >= NOW() - ${interval}
          AND "userAgent" IS NOT NULL
          AND BTRIM("userAgent") <> ''
        GROUP BY "userAgent", "path"
      `),
    ])

    const familyMap = new Map<
      string,
      { count: number; paths: Map<string, number> }
    >()
    for (const f of AI_CRAWLER_FAMILIES) {
      familyMap.set(f.id, { count: 0, paths: new Map() })
    }
    for (const row of uaRows) {
      const family = classifyAiCrawlerFamily(row.userAgent)
      if (!family) continue
      const bucket = familyMap.get(family.id)
      if (!bucket) continue
      const n = toNumber(row.count)
      bucket.count += n
      const path = row.path || "/"
      bucket.paths.set(path, (bucket.paths.get(path) || 0) + n)
    }

    const crawlers: AiCrawlerFamilyRow[] = AI_CRAWLER_FAMILIES.map((f) => {
      const bucket = familyMap.get(f.id)!
      const topPaths = [...bucket.paths.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([path, count]) => ({ path, count }))
      return {
        id: f.id,
        label: f.label,
        unverified: f.unverified,
        requestCount: bucket.count,
        topPaths,
      }
    }).filter((r) => r.requestCount > 0)

    const data: AiTrafficMetrics = {
      days,
      referral: {
        key: AI_REFERRAL_CHANNEL_KEY,
        humanPageviews: toNumber(pvRows[0]?.count),
        qualifiedVisits: toNumber(qvRows[0]?.count),
        ratings: toNumber(ratingRows[0]?.count),
        signups: toNumber(signupRows[0]?.count),
      },
      crawlers,
      uaSpoofNote: UA_SPOOF_NOTE,
    }
    setCache(cacheKey, data, 30_000)
    return data
  } catch (error) {
    console.error("Admin query failed getAiTrafficMetrics", error)
    return emptyAiTrafficMetrics(days)
  }
}
