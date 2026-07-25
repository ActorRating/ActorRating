import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/admin/cache"
import type { AdminGrowthPoint } from "@/lib/admin/getAdminData"

export type PageViewAnalyticsDays = 7 | 30

export type PageViewAnalytics = {
  days: PageViewAnalyticsDays
  humanPageviewsByDay: AdminGrowthPoint[]
  topReferrers: Array<{ domain: string; count: number }>
  utmSourceBreakdown: Array<{ source: string; count: number }>
  topPages: Array<{ path: string; count: number }>
  botVsHuman: {
    human: number
    bot: number
    knownCrawler: number
    unidentified: number
    /** Always last 7 days for a stable noise signal */
    windowDays: 7
  }
}

type DayCountRow = { day: Date; count: bigint | number }
type NamedCountRow = { name: string; count: bigint | number }

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
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

function emptyAnalytics(days: PageViewAnalyticsDays): PageViewAnalytics {
  const todayStart = startOfToday()
  return {
    days,
    humanPageviewsByDay: fillDailySeries([], days, todayStart),
    topReferrers: [],
    utmSourceBreakdown: [],
    topPages: [],
    botVsHuman: { human: 0, bot: 0, knownCrawler: 0, unidentified: 0, windowDays: 7 },
  }
}

export function parseAnalyticsDays(raw: string | undefined): PageViewAnalyticsDays {
  return raw === "30" ? 30 : 7
}

/**
 * First-party PageView aggregates for the admin dashboard.
 * Human-only for charts/tables; bot vs human is a separate 7-day ratio.
 */
export async function getPageViewAnalytics(
  days: PageViewAnalyticsDays = 7,
): Promise<PageViewAnalytics> {
  const cacheKey = `admin:pageviews:${days}`
  const cached = getCache<PageViewAnalytics>(cacheKey)
  if (cached) return cached

  const todayStart = startOfToday()
  const interval = days === 30 ? Prisma.sql`INTERVAL '29 days'` : Prisma.sql`INTERVAL '6 days'`

  try {
    const [dailyRows, referrerRows, utmRows, pageRows, botHumanRows, botCategoryRows] =
      await Promise.all([
        prisma.$queryRaw<DayCountRow[]>(Prisma.sql`
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
          WHERE "createdAt" >= NOW() - INTERVAL '6 days'
          GROUP BY "isLikelyBot"
        `),
        prisma.$queryRaw<Array<{ botCategory: string | null; count: bigint | number }>>(Prisma.sql`
          SELECT "botCategory"::text AS "botCategory", COUNT(*)::bigint AS count
          FROM "PageView"
          WHERE "isLikelyBot" = true
            AND "createdAt" >= NOW() - INTERVAL '6 days'
          GROUP BY "botCategory"
        `),
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
      else unidentified += n // null category on older bot rows until backfill
    }

    const data: PageViewAnalytics = {
      days,
      humanPageviewsByDay: fillDailySeries(dailyRows, days, todayStart),
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
      botVsHuman: { human, bot, knownCrawler, unidentified, windowDays: 7 },
    }

    setCache(cacheKey, data, 30_000)
    return data
  } catch (error) {
    console.error("Admin query failed getPageViewAnalytics", error)
    return emptyAnalytics(days)
  }
}
