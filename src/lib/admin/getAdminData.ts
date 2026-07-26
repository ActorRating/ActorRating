import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/admin/cache"
import {
  VALID_SOURCES,
  isValidSource,
  type AcquisitionSource,
} from "@/lib/tracking/source"

type GrowthRow = {
  day: Date
  count: bigint | number
}

type TopActorRow = {
  actorId: string
  actorName: string
  count: bigint | number
}

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

export type AdminGrowthPoint = {
  date: string
  count: number
}

export type AdminRecentRating = {
  id: string
  actorName: string
  movieTitle: string
  value: number
  username: string | null
  createdAt: Date
}

export type AdminDashboardData = {
  totalUsers: number
  totalRatings: number
  /** Ratings with a linked user account */
  signedInRatings: number
  /** Ratings with no userId (guest / orphaned after user delete) */
  guestRatings: number
  totalPerformances: number
  ratingsPerUser: number
  usersWithRatings: number
  conversionRate: number
  usersToday: number
  ratingsToday: number
  signedInRatingsToday: number
  guestRatingsToday: number
  avgRatingToday: number | null
  topActorToday: { id: string; name: string; count: number } | null
  growthLast7Days: AdminGrowthPoint[]
  recentRatings: AdminRecentRating[]
  sourceBreakdown: Array<{
    source: AcquisitionSource | "unknown"
    users: number
    usersWithRatings: number
    conversion: number
  }>
}

function startOfToday() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

function toNumber(value: bigint | number) {
  return typeof value === "bigint" ? Number(value) : value
}

export async function getAdminData(): Promise<AdminDashboardData> {
  const cacheKey = "admin:dashboard:summary"
  const cached = getCache<AdminDashboardData>(cacheKey)
  if (cached) return cached

  const todayStart = startOfToday()
  try {
    const [
      totalUsers,
      totalRatings,
      signedInRatings,
      guestRatings,
      totalPerformances,
      usersWithRatings,
      usersToday,
      ratingsToday,
      signedInRatingsToday,
      guestRatingsToday,
      todayAgg,
      growthRows,
      topActorRows,
      recentRatings,
      totalUsersBySource,
      usersWithRatingsBySource,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.rating.count(),
      prisma.rating.count({ where: { userId: { not: null } } }),
      prisma.rating.count({ where: { userId: null } }),
      prisma.performance.count(),
      prisma.user.count({
        where: {
          ratings: {
            some: {},
          },
        },
      }),
      prisma.user.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.rating.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.rating.count({
        where: { createdAt: { gte: todayStart }, userId: { not: null } },
      }),
      prisma.rating.count({
        where: { createdAt: { gte: todayStart }, userId: null },
      }),
      prisma.rating.aggregate({
        where: { createdAt: { gte: todayStart } },
        _avg: { weightedScore: true },
      }),
      prisma.$queryRaw<GrowthRow[]>(Prisma.sql`
        SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "Rating"
        WHERE "createdAt" >= NOW() - INTERVAL '6 days'
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY day ASC
      `),
      prisma.$queryRaw<TopActorRow[]>(Prisma.sql`
        SELECT
          r."actorId" AS "actorId",
          a."name" AS "actorName",
          COUNT(*)::bigint AS count
        FROM "Rating" r
        INNER JOIN "Actor" a ON a."id" = r."actorId"
        WHERE r."createdAt" >= DATE_TRUNC('day', NOW())
        GROUP BY r."actorId", a."name"
        ORDER BY count DESC
        LIMIT 1
      `),
      prisma.rating.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          weightedScore: true,
          createdAt: true,
          actor: { select: { name: true } },
          movie: { select: { title: true } },
          user: { select: { username: true } },
        },
      }),
      prisma.$queryRaw<Array<{ source: string | null; users: bigint | number }>>(Prisma.sql`
        SELECT "source" AS source, COUNT(*)::bigint AS users
        FROM "User"
        GROUP BY "source"
      `),
      prisma.$queryRaw<Array<{ source: string | null; usersWithRatings: bigint | number }>>(Prisma.sql`
        SELECT u."source" AS source, COUNT(DISTINCT u."id")::bigint AS "usersWithRatings"
        FROM "User" u
        INNER JOIN "Rating" r ON r."userId" = u."id"
        GROUP BY u."source"
      `),
    ])

  const growthByDate = new Map<string, number>()
  for (const row of growthRows) {
    const key = row.day.toISOString().slice(0, 10)
    growthByDate.set(key, toNumber(row.count))
  }

  const growthLast7Days: AdminGrowthPoint[] = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(todayStart)
    d.setDate(todayStart.getDate() - (6 - idx))
    const key = d.toISOString().slice(0, 10)
    return {
      date: dayFormatter.format(d),
      count: growthByDate.get(key) ?? 0,
    }
  })

  const topActorToday =
    topActorRows.length > 0
      ? {
          id: topActorRows[0].actorId,
          name: topActorRows[0].actorName,
          count: toNumber(topActorRows[0].count),
        }
      : null
  const ratingsPerUser = totalUsers > 0 ? totalRatings / totalUsers : 0
  const conversionRate = totalUsers > 0 ? (usersWithRatings / totalUsers) * 100 : 0

    const totalMap = new Map<string, number>()
    for (const row of totalUsersBySource) {
      const key = isValidSource(row.source) ? row.source : "unknown"
      totalMap.set(key, toNumber(row.users))
    }
    const raterMap = new Map<string, number>()
    for (const row of usersWithRatingsBySource) {
      const key = isValidSource(row.source) ? row.source : "unknown"
      raterMap.set(key, toNumber(row.usersWithRatings))
    }

    const sources: Array<AcquisitionSource | "unknown"> = [
      ...VALID_SOURCES,
      "unknown",
    ]
    const sourceBreakdown = sources.map((source) => {
      const users = totalMap.get(source) ?? 0
      const usersWithRatings = raterMap.get(source) ?? 0
      const conversion = users > 0 ? (usersWithRatings / users) * 100 : 0
      return { source, users, usersWithRatings, conversion }
    })
    const data: AdminDashboardData = {
      totalUsers,
      totalRatings,
      signedInRatings,
      guestRatings,
      totalPerformances,
      ratingsPerUser,
      usersWithRatings,
      conversionRate,
      usersToday,
      ratingsToday,
      signedInRatingsToday,
      guestRatingsToday,
      avgRatingToday: todayAgg._avg.weightedScore ?? null,
      topActorToday,
      growthLast7Days,
      recentRatings: recentRatings.map((rating) => ({
        id: rating.id,
        actorName: rating.actor.name,
        movieTitle: rating.movie.title,
        value: Number(rating.weightedScore.toFixed(1)),
        username: rating.user?.username ?? null,
        createdAt: rating.createdAt,
      })),
      sourceBreakdown,
    }
    setCache(cacheKey, data, 30_000)
    return data
  } catch (error) {
    console.error("Admin query failed getAdminData", error)
    return {
      totalUsers: 0,
      totalRatings: 0,
      signedInRatings: 0,
      guestRatings: 0,
      totalPerformances: 0,
      ratingsPerUser: 0,
      usersWithRatings: 0,
      conversionRate: 0,
      usersToday: 0,
      ratingsToday: 0,
      signedInRatingsToday: 0,
      guestRatingsToday: 0,
      avgRatingToday: null,
      topActorToday: null,
      growthLast7Days: Array.from({ length: 7 }).map((_, idx) => {
        const d = new Date(todayStart)
        d.setDate(todayStart.getDate() - (6 - idx))
        return { date: dayFormatter.format(d), count: 0 }
      }),
      recentRatings: [],
      sourceBreakdown: [
        ...VALID_SOURCES.map((source) => ({
          source,
          users: 0,
          usersWithRatings: 0,
          conversion: 0,
        })),
        { source: "unknown" as const, users: 0, usersWithRatings: 0, conversion: 0 },
      ],
    }
  }
}
