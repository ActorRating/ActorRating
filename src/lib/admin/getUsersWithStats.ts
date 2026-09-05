import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { getCache, setCache } from "@/lib/admin/cache"
import {
  adminVisibleUserEmailSql,
  adminVisibleUserWhere,
} from "@/lib/admin/hidden-users"
import { isValidSource } from "@/lib/tracking/source"

export type AdminUserWithStats = {
  id: string
  name: string | null
  username: string | null
  email: string
  createdAt: Date
  signupProvider: string | null
  source: string | null
  totalRatings: number
  averageRating: number
  firstActivity: Date
  lastActivity: Date
}

type GetUsersWithStatsParams = {
  search?: string
  page?: number
  take?: number
}

type UserStatsRow = {
  id: string
  name: string | null
  username: string | null
  email: string
  createdAt: Date
  signupProvider: string | null
  source: string | null
  totalRatings: bigint | number
  averageRating: number | null
  firstActivity: Date | null
  lastActivity: Date | null
}

export async function getUsersWithStats(
  params: GetUsersWithStatsParams = {}
): Promise<{
  users: AdminUserWithStats[]
  page: number
  take: number
  totalCount: number
  hasNext: boolean
}> {
  const search = params.search?.trim()
  const page = Number.isFinite(params.page) && (params.page ?? 0) >= 0 ? (params.page ?? 0) : 0
  const take =
    Number.isFinite(params.take) && (params.take ?? 50) > 0 ? Math.min(params.take ?? 50, 50) : 50
  const skip = page * take
  const searchTerm = search && search.length > 0 ? `%${search}%` : null
  const cacheKey = `admin:users:v2:${search ?? "all"}:${page}:${take}`
  const cached = getCache<{
    users: AdminUserWithStats[]
    page: number
    take: number
    totalCount: number
    hasNext: boolean
  }>(cacheKey)
  if (cached) return cached

  const visible = adminVisibleUserWhere()

  try {
    const [rows, totalCount] = await Promise.all([
      prisma.$queryRaw<UserStatsRow[]>(Prisma.sql`
        SELECT
          u."id",
          u."name",
          u."username",
          u."email",
          u."createdAt",
          u."source" AS "source",
          CASE
            WHEN BOOL_OR(a."provider" = 'google') THEN 'google'
            WHEN BOOL_OR(a."provider" = 'email') THEN 'email'
            ELSE MIN(a."provider")
          END AS "signupProvider",
          COUNT(r."id")::bigint AS "totalRatings",
          AVG(r."weightedScore")::float AS "averageRating",
          MIN(r."createdAt") AS "firstActivity",
          MAX(r."createdAt") AS "lastActivity"
        FROM "User" u
        LEFT JOIN "Rating" r ON r."userId" = u."id"
        LEFT JOIN "Account" a ON a."userId" = u."id"
        WHERE (${adminVisibleUserEmailSql()})
          AND (
            ${searchTerm}::text IS NULL
            OR u."username" ILIKE ${searchTerm}
            OR u."email" ILIKE ${searchTerm}
            OR u."name" ILIKE ${searchTerm}
          )
        GROUP BY u."id", u."name", u."username", u."email", u."createdAt"
        ORDER BY COALESCE(MAX(r."createdAt"), u."createdAt") DESC
        LIMIT ${take}
        OFFSET ${skip}
      `),
      prisma.user.count({
        where: {
          AND: [
            visible,
            search
              ? {
                  OR: [
                    { username: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { name: { contains: search, mode: "insensitive" } },
                  ],
                }
              : {},
          ],
        },
      }),
    ])

    const users = rows.map((row) => ({
      id: row.id,
      name: row.name,
      username: row.username,
      email: row.email,
      createdAt: row.createdAt,
      signupProvider: row.signupProvider,
      source: isValidSource(row.source) ? row.source : null,
      totalRatings: typeof row.totalRatings === "bigint" ? Number(row.totalRatings) : row.totalRatings,
      averageRating: row.averageRating ?? 0,
      firstActivity: row.firstActivity ?? row.createdAt,
      lastActivity: row.lastActivity ?? row.createdAt,
    }))

    const result = {
      users,
      page,
      take,
      totalCount,
      hasNext: (page + 1) * take < totalCount,
    }
    setCache(cacheKey, result, 60_000)
    return result
  } catch (error) {
    console.error("Admin query failed getUsersWithStats", error)
    return {
      users: [],
      page,
      take,
      totalCount: 0,
      hasNext: false,
    }
  }
}
