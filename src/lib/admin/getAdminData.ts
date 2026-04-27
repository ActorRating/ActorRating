import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

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
  totalPerformances: number
  ratingsPerUser: number
  usersWithRatings: number
  conversionRate: number
  usersToday: number
  ratingsToday: number
  avgRatingToday: number | null
  topActorToday: { id: string; name: string; count: number } | null
  growthLast7Days: AdminGrowthPoint[]
  recentRatings: AdminRecentRating[]
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
  const todayStart = startOfToday()

  const [
    totalUsers,
    totalRatings,
    totalPerformances,
    usersWithRatings,
    usersToday,
    ratingsToday,
    todayAgg,
    growthRows,
    topActorRows,
    recentRatings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.rating.count(),
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

  return {
    totalUsers,
    totalRatings,
    totalPerformances,
    ratingsPerUser,
    usersWithRatings,
    conversionRate,
    usersToday,
    ratingsToday,
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
  }
}
