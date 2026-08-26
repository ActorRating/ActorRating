import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/admin/cache"
import type { AdminGrowthPoint } from "@/lib/admin/getAdminData"

export type PageViewAnalyticsDays = 1 | 7 | 30

export type RecentHumanPageView = {
  id: string
  path: string
  referrerDomain: string
  utmSource: string | null
  signedIn: boolean
  ipHashShort: string
  createdAt: Date
}

export type PageViewAnalytics = {
  days: PageViewAnalyticsDays
  humanPageviewsByDay: AdminGrowthPoint[]
  /** Distinct ipHash among human (non-bot) pageviews in the selected window */
  uniqueHumanVisitors: number
  topReferrers: Array<{ domain: string; count: number }>
  utmSourceBreakdown: Array<{ source: string; count: number }>
  topPages: Array<{ path: string; count: number }>
  /** Most recent human pageviews (not limited to the selected window) */
  recentHumanPageviews: RecentHumanPageView[]
  botVsHuman: {
    human: number
    bot: number
    knownCrawler: number
    unidentified: number
    /** Matches the selected traffic window */
    windowDays: PageViewAnalyticsDays
  }
}

type DayCountRow = { day: Date; count: bigint | number }
type NamedCountRow = { name: string; count: bigint | number }

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

const hourFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hour12: true,
})

function toNumber(value: bigint | number) {
  return typeof value === "bigint" ? Number(value) : value
}

function startOfToday() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

function fillDailySeries(
  rows: DayCountRow[],
  days: number,
  todayStart: Date,
): AdminGrowthPoint[] {
  const byDate = new Map<string, number>()
  for (const row of rows) {
    byDate.set(row.day.toISOString().slice(0, 10), toNumber(row.count))
  }
  return Array.from({ length: days }).map((_, idx) => {
    const d = new Date(todayStart)
    d.setDate(todayStart.getDate() - (days - 1 - idx))
    const key = d.toISOString().slice(0, 10)
    return {
      date: dayFormatter.format(d),
      count: byDate.get(key) ?? 0,
    }
  })
}

function fillHourlySeries(rows: DayCountRow[], now: Date): AdminGrowthPoint[] {
  const byHour = new Map<string, number>()
  for (const row of rows) {
    const d = new Date(row.day)
    d.setMinutes(0, 0, 0)
    byHour.set(d.toISOString(), toNumber(row.count))
  }
  return Array.from({ length: 24 }).map((_, idx) => {
    const d = new Date(now)
    d.setMinutes(0, 0, 0)
    d.setSeconds(0, 0)
    d.setHours(d.getHours() - (23 - idx))
    return {
      date: hourFormatter.format(d),
      count: byHour.get(d.toISOString()) ?? 0,
    }
  })
}

function referrerDomain(referrer: string | null | undefined): string {
  const raw = referrer?.trim()
  if (!raw) return "(direct)"
  try {
    const host = new URL(raw).hostname.replace(/^www\./i, "").toLowerCase()
    return host || "(direct)"
  } catch {
    return "(direct)"
  }
}

function emptyAnalytics(days: PageViewAnalyticsDays): PageViewAnalytics {
  const todayStart = startOfToday()
  const now = new Date()
  return {
    days,
    humanPageviewsByDay:
      days === 1 ? fillHourlySeries([], now) : fillDailySeries([], days, todayStart),
    uniqueHumanVisitors: 0,
    topReferrers: [],
    utmSourceBreakdown: [],
    topPages: [],
    recentHumanPageviews: [],
    botVsHuman: {
      human: 0,
      bot: 0,
      knownCrawler: 0,
      unidentified: 0,
      windowDays: days,
    },
  }
}

export function parseAnalyticsDays(raw: string | undefined): PageViewAnalyticsDays {
  if (raw === "1" || raw === "24") return 1
  if (raw === "30") return 30
  return 7
}

export function analyticsWindowLabel(days: PageViewAnalyticsDays): string {
  if (days === 1) return "24h"
  return `${days}d`
}

function intervalForDays(days: PageViewAnalyticsDays): Prisma.Sql {
  // Must be Prisma.raw — nesting Prisma.sql`INTERVAL …` becomes a bound
  // parameter and breaks `NOW() - $1` in Postgres (all traffic stats → 0).
  if (days === 1) return Prisma.raw(`INTERVAL '24 hours'`)
  if (days === 30) return Prisma.raw(`INTERVAL '29 days'`)
  return Prisma.raw(`INTERVAL '6 days'`)
}

/**
 * First-party PageView aggregates for the admin dashboard.
 * Human-only for charts/tables; bot vs human uses the same selected window.
 */
export async function getPageViewAnalytics(
  days: PageViewAnalyticsDays = 7,
): Promise<PageViewAnalytics> {
  const cacheKey = `admin:pageviews:${days}`
  const cached = getCache<PageViewAnalytics>(cacheKey)
  if (cached) return cached

  const todayStart = startOfToday()
  const now = new Date()
  const interval = intervalForDays(days)

  try {
    const [
      dailyRows,
      referrerRows,
      utmRows,
      pageRows,
      botHumanRows,
      botCategoryRows,
      uniqueHumanRows,
      recentHumanRows,
    ] = await Promise.all([
      days === 1
        ? prisma.$queryRaw<DayCountRow[]>(Prisma.sql`
            SELECT DATE_TRUNC('hour', "createdAt") AS day, COUNT(*)::bigint AS count
            FROM "PageView"
            WHERE "isLikelyBot" = false
              AND "createdAt" >= NOW() - ${interval}
            GROUP BY DATE_TRUNC('hour', "createdAt")
            ORDER BY day ASC
          `)
        : prisma.$queryRaw<DayCountRow[]>(Prisma.sql`
            SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::bigint AS count
            FROM "PageView"
            WHERE "isLikelyBot" = false
              AND "createdAt" >= NOW() - ${interval}
            GROUP BY DATE_TRUNC('day', "createdAt")
            ORDER BY day ASC
          `),
      prisma.$queryRaw<NamedCountRow[]>(Prisma.sql`
        SELECT
          CASE
            WHEN "referrer" IS NULL OR BTRIM("referrer") = '' THEN '(direct)'
            ELSE COALESCE(
              NULLIF(
                REGEXP_REPLACE(
                  SUBSTRING("referrer" FROM '://([^/?#]+)'),
                  '^www\\.',
                  ''
                ),
                ''
              ),
              '(direct)'
            )
          END AS name,
          COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 15
      `),
      prisma.$queryRaw<NamedCountRow[]>(Prisma.sql`
        SELECT
          COALESCE(NULLIF(BTRIM("utmSource"), ''), '(none)') AS name,
          COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 20
      `),
      prisma.$queryRaw<NamedCountRow[]>(Prisma.sql`
        SELECT "path" AS name, COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
        GROUP BY "path"
        ORDER BY count DESC
        LIMIT 20
      `),
      prisma.$queryRaw<Array<{ isLikelyBot: boolean; count: bigint | number }>>(Prisma.sql`
        SELECT "isLikelyBot", COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "createdAt" >= NOW() - ${interval}
        GROUP BY "isLikelyBot"
      `),
      prisma.$queryRaw<Array<{ botCategory: string | null; count: bigint | number }>>(Prisma.sql`
        SELECT "botCategory"::text AS "botCategory", COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = true
          AND "createdAt" >= NOW() - ${interval}
        GROUP BY "botCategory"
      `),
      prisma.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`
        SELECT COUNT(DISTINCT "ipHash")::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
      `),
      prisma.pageView.findMany({
        where: {
          isLikelyBot: false,
          // Admin browsing is not "site traffic" — keep the feed product-facing.
          NOT: { path: { startsWith: "/admin" } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          path: true,
          referrer: true,
          utmSource: true,
          userId: true,
          ipHash: true,
          createdAt: true,
        },
      }),
    ])

    let human = 0
    let bot = 0
    for (const row of botHumanRows) {
      if (row.isLikelyBot) bot = toNumber(row.count)
      else human = toNumber(row.count)
    }

    let knownCrawler = 0
    let unidentified = 0
    for (const row of botCategoryRows) {
      const n = toNumber(row.count)
      if (row.botCategory === "KNOWN_CRAWLER") knownCrawler = n
      else if (row.botCategory === "UNIDENTIFIED") unidentified = n
      else unidentified += n
    }

    const uniqueHumanVisitors = toNumber(uniqueHumanRows[0]?.count ?? 0)

    const data: PageViewAnalytics = {
      days,
      humanPageviewsByDay:
        days === 1
          ? fillHourlySeries(dailyRows, now)
          : fillDailySeries(dailyRows, days, todayStart),
      uniqueHumanVisitors,
      topReferrers: referrerRows.map((r) => ({
        domain: r.name,
        count: toNumber(r.count),
      })),
      utmSourceBreakdown: utmRows.map((r) => ({
        source: r.name,
        count: toNumber(r.count),
      })),
      topPages: pageRows.map((r) => ({
        path: r.name,
        count: toNumber(r.count),
      })),
      recentHumanPageviews: recentHumanRows.map((r) => ({
        id: r.id,
        path: r.path,
        referrerDomain: referrerDomain(r.referrer),
        utmSource: r.utmSource,
        signedIn: Boolean(r.userId),
        ipHashShort: r.ipHash.slice(0, 10),
        createdAt: r.createdAt,
      })),
      botVsHuman: { human, bot, knownCrawler, unidentified, windowDays: days },
    }

    setCache(cacheKey, data, 30_000)
    return data
  } catch (error) {
    console.error("Admin query failed getPageViewAnalytics", error)
    return emptyAnalytics(days)
  }
}
