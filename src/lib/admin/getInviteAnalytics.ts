import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/admin/cache"
import {
  parseAnalyticsDays,
  type PageViewAnalyticsDays,
} from "@/lib/admin/getPageViewAnalytics"
import { inviteRegisterUrl } from "@/lib/invites"

export type { PageViewAnalyticsDays }
export { parseAnalyticsDays }

export type InviteCodeStat = {
  code: string
  registerPath: string
  registerUrl: string
  maxUses: number
  usedCount: number
  unlimited: boolean
  /** Human pageviews of /auth/register?code=CODE in the window */
  landingHits: number
  uniqueVisitors: number
  /** Redemptions (InviteRedemption) created in the window */
  redemptionsInWindow: number
  createdAt: Date
}

export type InviteAnalytics = {
  days: PageViewAnalyticsDays
  /** Human hits to /auth/register?code=* in the window */
  totalLandingHits: number
  /** Distinct invite codes that received ≥1 hit */
  codesWithHits: number
  codes: InviteCodeStat[]
  /** Recent register landings with a code (human) */
  recentLandings: Array<{
    id: string
    path: string
    code: string
    referrer: string | null
    createdAt: Date
  }>
}

type CountByPathRow = { path: string; hits: bigint | number; uniques: bigint | number }
type CountByCodeRow = { code: string; count: bigint | number }

function toNumber(value: bigint | number) {
  return typeof value === "bigint" ? Number(value) : value
}

function intervalForDays(days: PageViewAnalyticsDays): Prisma.Sql {
  if (days === 1) return Prisma.raw(`INTERVAL '24 hours'`)
  if (days === 30) return Prisma.raw(`INTERVAL '29 days'`)
  return Prisma.raw(`INTERVAL '6 days'`)
}

function codeFromRegisterPath(path: string): string | null {
  const m = path.match(/^\/auth\/register\?code=([A-Z0-9-]+)$/i)
  return m?.[1]?.toUpperCase() ?? null
}

function emptyAnalytics(days: PageViewAnalyticsDays): InviteAnalytics {
  return {
    days,
    totalLandingHits: 0,
    codesWithHits: 0,
    codes: [],
    recentLandings: [],
  }
}

/**
 * Invite-code landing + redemption stats for the admin Users tab.
 */
export async function getInviteAnalytics(
  days: PageViewAnalyticsDays = 7,
): Promise<InviteAnalytics> {
  const cacheKey = `admin:invites:${days}`
  const cached = getCache<InviteAnalytics>(cacheKey)
  if (cached) return cached

  const interval = intervalForDays(days)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  try {
    const [inviteRows, hitRows, redemptionRows, recentRows] = await Promise.all([
      prisma.inviteCode.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          code: true,
          maxUses: true,
          usedCount: true,
          createdAt: true,
        },
      }),
      prisma.$queryRaw<CountByPathRow[]>(Prisma.sql`
        SELECT
          "path",
          COUNT(*)::bigint AS hits,
          COUNT(DISTINCT "ipHash")::bigint AS uniques
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND "path" LIKE '/auth/register?code=%'
        GROUP BY "path"
      `),
      prisma.$queryRaw<CountByCodeRow[]>(Prisma.sql`
        SELECT ic."code" AS code, COUNT(*)::bigint AS count
        FROM "InviteRedemption" ir
        INNER JOIN "InviteCode" ic ON ic."id" = ir."inviteCodeId"
        WHERE ir."createdAt" >= NOW() - ${interval}
        GROUP BY ic."code"
      `),
      prisma.pageView.findMany({
        where: {
          isLikelyBot: false,
          createdAt: { gte: since },
          path: { startsWith: "/auth/register?code=" },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          path: true,
          referrer: true,
          createdAt: true,
        },
      }),
    ])

    const hitsByCode = new Map<string, { hits: number; uniques: number }>()
    for (const row of hitRows) {
      const code = codeFromRegisterPath(row.path)
      if (!code) continue
      hitsByCode.set(code, {
        hits: toNumber(row.hits),
        uniques: toNumber(row.uniques),
      })
    }

    const redemptionsByCode = new Map<string, number>()
    for (const row of redemptionRows) {
      redemptionsByCode.set(row.code.toUpperCase(), toNumber(row.count))
    }

    // Include codes that either exist in InviteCode or got landings (typos / deleted).
    const codeSet = new Set<string>([
      ...inviteRows.map((r) => r.code.toUpperCase()),
      ...hitsByCode.keys(),
    ])

    const inviteMeta = new Map(
      inviteRows.map((r) => [r.code.toUpperCase(), r] as const),
    )

    const codes: InviteCodeStat[] = Array.from(codeSet)
      .map((code) => {
        const meta = inviteMeta.get(code)
        const hits = hitsByCode.get(code)
        const registerPath = `/auth/register?code=${code}`
        return {
          code,
          registerPath,
          registerUrl: inviteRegisterUrl(code),
          maxUses: meta?.maxUses ?? 0,
          usedCount: meta?.usedCount ?? 0,
          unlimited: (meta?.maxUses ?? 0) <= 0,
          landingHits: hits?.hits ?? 0,
          uniqueVisitors: hits?.uniques ?? 0,
          redemptionsInWindow: redemptionsByCode.get(code) ?? 0,
          createdAt: meta?.createdAt ?? new Date(0),
        }
      })
      .sort((a, b) => {
        if (b.landingHits !== a.landingHits) return b.landingHits - a.landingHits
        if (b.usedCount !== a.usedCount) return b.usedCount - a.usedCount
        return b.createdAt.getTime() - a.createdAt.getTime()
      })

    const totalLandingHits = codes.reduce((s, c) => s + c.landingHits, 0)
    const codesWithHits = codes.filter((c) => c.landingHits > 0).length

    const recentLandings = recentRows
      .map((r) => {
        const code = codeFromRegisterPath(r.path)
        if (!code) return null
        return {
          id: r.id,
          path: r.path,
          code,
          referrer: r.referrer,
          createdAt: r.createdAt,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    const data: InviteAnalytics = {
      days,
      totalLandingHits,
      codesWithHits,
      codes,
      recentLandings,
    }
    setCache(cacheKey, data, 30_000)
    return data
  } catch (error) {
    console.error("Admin query failed getInviteAnalytics", error)
    return emptyAnalytics(days)
  }
}
