import { prisma } from "@/lib/prisma"

export type AdminUserWithStats = {
  id: string
  name: string | null
  username: string | null
  email: string
  createdAt: Date
  totalRatings: number
  averageRating: number
  firstActivity: Date
  lastActivity: Date
}

type GetUsersWithStatsParams = {
  search?: string
}

export async function getUsersWithStats(
  params: GetUsersWithStatsParams = {}
): Promise<AdminUserWithStats[]> {
  const search = params.search?.trim()

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      createdAt: true,
      ratings: {
        select: {
          createdAt: true,
          weightedScore: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  const withStats = users.map((user) => {
    const totalRatings = user.ratings.length
    const scoreSum = user.ratings.reduce((sum, rating) => sum + rating.weightedScore, 0)
    const averageRating = totalRatings > 0 ? scoreSum / totalRatings : 0
    const firstActivity = user.ratings[0]?.createdAt ?? user.createdAt
    const lastActivity = user.ratings[totalRatings - 1]?.createdAt ?? user.createdAt

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      totalRatings,
      averageRating,
      firstActivity,
      lastActivity,
    }
  })

  withStats.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())

  return withStats
}
