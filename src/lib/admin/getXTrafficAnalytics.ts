import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/admin/cache"
import type { AdminGrowthPoint } from "@/lib/admin/getAdminData"
import {
  analyticsWindowLabel,
  parseAnalyticsDays,
  type PageViewAnalyticsDays,
} from "@/lib/admin/getPageViewAnalytics"

export type { PageViewAnalyticsDays }
export { analyticsWindowLabel, parseAnalyticsDays }

export type RecentXPageView = {
  id: string
  path: string
  referrerDomain: string
  attribution: "tagged" | "organic" | "both"
  utmSource: string | null
  createdAt: Date
}

export type XActivationFunnelStep = {
  key: string
  label: string
  description: string
  count: number
  /** % of previous step; null for the first step */
  conversionFromPrevious: number | null
}

export type XTrafficAnalytics = {
  days: PageViewAnalyticsDays
  /** Human pageviews attributed to X (tagged and/or organic referrer) */
  xPageviews: number
  uniqueVisitors: number
  /** Share of all human pageviews in the window */
  pctOfHumanTraffic: number
  taggedPageviews: number
  organicPageviews: number
  /** Both tagged UTM and organic referrer on the same hit */
  bothPageviews: number
  pageviewsByDay: AdminGrowthPoint[]
  topLandingPaths: Array<{ path: string; count: number }>
  usersFromX: number
  waitlistFromX: number
  recent: RecentXPageView[]
  activationFunnel: XActivationFunnelStep[]
}

type DayCountRow = { day: Date; count: bigint | number }
type NamedCountRow = { name: string; count: bigint | number }
type CountRow = { count: bigint | number }

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

function intervalForDays(days: PageViewAnalyticsDays): Prisma.Sql {
  if (days === 1) return Prisma.raw(`INTERVAL '24 hours'`)
  if (days === 30) return Prisma.raw(`INTERVAL '29 days'`)
  return Prisma.raw(`INTERVAL '6 days'`)
}

/** Tagged UTM/src OR organic X/Twitter/t.co referrer. */
const X_ATTRIBUTED_SQL = Prisma.raw(`(
  LOWER(COALESCE("utmSource", '')) IN ('x', 'twitter')
  OR LOWER(COALESCE(
    NULLIF(REGEXP_REPLACE(SUBSTRING("referrer" FROM '://([^/?#]+)'), '^www\\.', ''), ''),
    ''
  )) IN ('twitter.com', 'x.com', 't.co')
)`)

const X_TAGGED_SQL = Prisma.raw(
  `LOWER(COALESCE("utmSource", '')) IN ('x', 'twitter')`,
)

const X_ORGANIC_SQL = Prisma.raw(`(
  LOWER(COALESCE(
    NULLIF(REGEXP_REPLACE(SUBSTRING("referrer" FROM '://([^/?#]+)'), '^www\\.', ''), ''),
    ''
  )) IN ('twitter.com', 'x.com', 't.co')
)`)

/** Product events with first-touch source = x or utm_source = x/twitter. */
const X_EVENT_ATTRIBUTED_SQL = Prisma.raw(`(
  LOWER(COALESCE("source", '')) = 'x'
  OR LOWER(COALESCE("utmSource", '')) IN ('x', 'twitter')
)`)

function pct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null
  return (current / previous) * 100
}

function buildActivationFunnel(counts: {
  ratePageviews: number
  performanceViewed: number
  sliderMoved: number
  ratingSubmitted: number
  signupStarted: number
  repeatRating: number
}): XActivationFunnelStep[] {
  const steps: Array<Omit<XActivationFunnelStep, "conversionFromPrevious">> = [
    {
      key: "rate_pageviews",
      label: "X → /rate/ pageviews",
      description: "Human pageviews on performance pages from X",
      count: counts.ratePageviews,
    },
    {
      key: "performance_viewed",
      label: "Performance viewed",
      description: "Client event: canonical rate page loaded",
      count: counts.performanceViewed,
    },
    {
      key: "rating_slider_moved",
      label: "Rating started",
      description: "Client event: first slider interaction",
      count: counts.sliderMoved,
    },
    {
      key: "rating_submitted",
      label: "Rating completed",
      description: "Client event: rating saved",
      count: counts.ratingSubmitted,
    },
    {
      key: "signup_started",
      label: "Signup started",
      description: "Client event: register page or save modal",
      count: counts.signupStarted,
    },
    {
      key: "repeat_rating",
      label: "Repeat rating",
      description: "X-attributed rating_submitted with rating_timing = repeat",
      count: counts.repeatRating,
    },
  ]

  return steps.map((step, index) => ({
    ...step,
    conversionFromPrevious:
      index === 0 ? null : pct(step.count, steps[index - 1]!.count),
  }))
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

function attributionOf(row: {
  utmSource: string | null
  referrer: string | null
}): "tagged" | "organic" | "both" {
  const utm = (row.utmSource || "").trim().toLowerCase()
  const tagged = utm === "x" || utm === "twitter"
  const host = referrerDomain(row.referrer)
  const organic = host === "twitter.com" || host === "x.com" || host === "t.co"
  if (tagged && organic) return "both"
  if (tagged) return "tagged"
  return "organic"
}

function emptyAnalytics(days: PageViewAnalyticsDays): XTrafficAnalytics {
  const todayStart = startOfToday()
  const now = new Date()
  return {
    days,
    xPageviews: 0,
    uniqueVisitors: 0,
    pctOfHumanTraffic: 0,
    taggedPageviews: 0,
    organicPageviews: 0,
    bothPageviews: 0,
    pageviewsByDay:
      days === 1 ? fillHourlySeries([], now) : fillDailySeries([], days, todayStart),
    topLandingPaths: [],
    usersFromX: 0,
    waitlistFromX: 0,
    recent: [],
    activationFunnel: buildActivationFunnel({
      ratePageviews: 0,
      performanceViewed: 0,
      sliderMoved: 0,
      ratingSubmitted: 0,
      signupStarted: 0,
      repeatRating: 0,
    }),
  }
}

/**
 * X/Twitter-attributed human traffic for the admin X tab.
 */
export async function getXTrafficAnalytics(
  days: PageViewAnalyticsDays = 7,
): Promise<XTrafficAnalytics> {
  const cacheKey = `admin:x-traffic:${days}`
  const cached = getCache<XTrafficAnalytics>(cacheKey)
  if (cached) return cached

  const todayStart = startOfToday()
  const now = new Date()
  const interval = intervalForDays(days)

  try {
    const [
      totalHumanRows,
      xCountRows,
      taggedRows,
      organicRows,
      bothRows,
      uniqueRows,
      seriesRows,
      pathRows,
      usersFromX,
      waitlistFromX,
      recentRows,
      ratePageviewRows,
    ] = await Promise.all([
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND ${X_ATTRIBUTED_SQL}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND ${X_TAGGED_SQL}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND ${X_ORGANIC_SQL}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND ${X_TAGGED_SQL}
          AND ${X_ORGANIC_SQL}
      `),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(DISTINCT "ipHash")::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND ${X_ATTRIBUTED_SQL}
      `),
      days === 1
        ? prisma.$queryRaw<DayCountRow[]>(Prisma.sql`
            SELECT DATE_TRUNC('hour', "createdAt") AS day, COUNT(*)::bigint AS count
            FROM "PageView"
            WHERE "isLikelyBot" = false
              AND "createdAt" >= NOW() - ${interval}
              AND ${X_ATTRIBUTED_SQL}
            GROUP BY DATE_TRUNC('hour', "createdAt")
            ORDER BY day ASC
          `)
        : prisma.$queryRaw<DayCountRow[]>(Prisma.sql`
            SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::bigint AS count
            FROM "PageView"
            WHERE "isLikelyBot" = false
              AND "createdAt" >= NOW() - ${interval}
              AND ${X_ATTRIBUTED_SQL}
            GROUP BY DATE_TRUNC('day', "createdAt")
            ORDER BY day ASC
          `),
      prisma.$queryRaw<NamedCountRow[]>(Prisma.sql`
        SELECT "path" AS name, COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND ${X_ATTRIBUTED_SQL}
        GROUP BY "path"
        ORDER BY count DESC
        LIMIT 15
      `),
      prisma.user.count({
        where: {
          source: "x",
          createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.waitlistEntry.count({
        where: {
          source: "x",
          createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.pageView.findMany({
        where: {
          isLikelyBot: false,
          createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
          OR: [
            { utmSource: { equals: "x", mode: "insensitive" } },
            { utmSource: { equals: "twitter", mode: "insensitive" } },
            { referrer: { contains: "twitter.com", mode: "insensitive" } },
            { referrer: { contains: "x.com", mode: "insensitive" } },
            { referrer: { contains: "t.co", mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          path: true,
          referrer: true,
          utmSource: true,
          createdAt: true,
        },
      }),
      prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND ${X_ATTRIBUTED_SQL}
          AND "path" LIKE '/rate/%'
      `),
    ])

    let performanceViewed = 0
    let sliderMoved = 0
    let ratingSubmitted = 0
    let signupStarted = 0
    let repeatRating = 0

    try {
      const [
        performanceViewedRows,
        sliderMovedRows,
        ratingSubmittedRows,
        signupStartedRows,
        repeatRatingRows,
      ] = await Promise.all([
        prisma.$queryRaw<CountRow[]>(Prisma.sql`
          SELECT COUNT(*)::bigint AS count
          FROM "ProductEvent"
          WHERE "isLikelyBot" = false
            AND "createdAt" >= NOW() - ${interval}
            AND ${X_EVENT_ATTRIBUTED_SQL}
            AND "name" = 'performance_viewed'
        `),
        prisma.$queryRaw<CountRow[]>(Prisma.sql`
          SELECT COUNT(*)::bigint AS count
          FROM "ProductEvent"
          WHERE "isLikelyBot" = false
            AND "createdAt" >= NOW() - ${interval}
            AND ${X_EVENT_ATTRIBUTED_SQL}
            AND "name" = 'rating_slider_moved'
        `),
        prisma.$queryRaw<CountRow[]>(Prisma.sql`
          SELECT COUNT(*)::bigint AS count
          FROM "ProductEvent"
          WHERE "isLikelyBot" = false
            AND "createdAt" >= NOW() - ${interval}
            AND ${X_EVENT_ATTRIBUTED_SQL}
            AND "name" = 'rating_submitted'
        `),
        prisma.$queryRaw<CountRow[]>(Prisma.sql`
          SELECT COUNT(*)::bigint AS count
          FROM "ProductEvent"
          WHERE "isLikelyBot" = false
            AND "createdAt" >= NOW() - ${interval}
            AND ${X_EVENT_ATTRIBUTED_SQL}
            AND "name" = 'signup_started'
        `),
        prisma.$queryRaw<CountRow[]>(Prisma.sql`
          SELECT COUNT(*)::bigint AS count
          FROM "ProductEvent"
          WHERE "isLikelyBot" = false
            AND "createdAt" >= NOW() - ${interval}
            AND ${X_EVENT_ATTRIBUTED_SQL}
            AND "name" = 'rating_submitted'
            AND COALESCE("properties"->>'rating_timing', '') = 'repeat'
        `),
      ])

      performanceViewed = toNumber(performanceViewedRows[0]?.count ?? 0)
      sliderMoved = toNumber(sliderMovedRows[0]?.count ?? 0)
      ratingSubmitted = toNumber(ratingSubmittedRows[0]?.count ?? 0)
      signupStarted = toNumber(signupStartedRows[0]?.count ?? 0)
      repeatRating = toNumber(repeatRatingRows[0]?.count ?? 0)
    } catch {
      // ProductEvent table may not exist until migration is applied
    }

    const humanTotal = toNumber(totalHumanRows[0]?.count ?? 0)
    const xPageviews = toNumber(xCountRows[0]?.count ?? 0)
    const taggedPageviews = toNumber(taggedRows[0]?.count ?? 0)
    const organicPageviews = toNumber(organicRows[0]?.count ?? 0)
    const bothPageviews = toNumber(bothRows[0]?.count ?? 0)
    const uniqueVisitors = toNumber(uniqueRows[0]?.count ?? 0)

    // Prisma OR on referrer may include false positives (e.g. other hosts with "x.com" substring).
    // Filter recent rows to true X attribution.
    const recent: RecentXPageView[] = recentRows
      .map((r) => {
        const attr = attributionOf(r)
        const host = referrerDomain(r.referrer)
        const utm = (r.utmSource || "").trim().toLowerCase()
        const tagged = utm === "x" || utm === "twitter"
        const organic = host === "twitter.com" || host === "x.com" || host === "t.co"
        if (!tagged && !organic) return null
        return {
          id: r.id,
          path: r.path,
          referrerDomain: host,
          attribution: attr,
          utmSource: r.utmSource,
          createdAt: r.createdAt,
        }
      })
      .filter((r): r is RecentXPageView => r !== null)
      .slice(0, 25)

    const data: XTrafficAnalytics = {
      days,
      xPageviews,
      uniqueVisitors,
      pctOfHumanTraffic: humanTotal > 0 ? (xPageviews / humanTotal) * 100 : 0,
      taggedPageviews,
      organicPageviews,
      bothPageviews,
      pageviewsByDay:
        days === 1
          ? fillHourlySeries(seriesRows, now)
          : fillDailySeries(seriesRows, days, todayStart),
      topLandingPaths: pathRows.map((r) => ({
        path: r.name,
        count: toNumber(r.count),
      })),
      usersFromX,
      waitlistFromX,
      recent,
      activationFunnel: buildActivationFunnel({
        ratePageviews: toNumber(ratePageviewRows[0]?.count ?? 0),
        performanceViewed,
        sliderMoved,
        ratingSubmitted,
        signupStarted,
        repeatRating,
      }),
    }

    setCache(cacheKey, data, 30_000)
    return data
  } catch (error) {
    console.error("Admin query failed getXTrafficAnalytics", error)
    return emptyAnalytics(days)
  }
}
