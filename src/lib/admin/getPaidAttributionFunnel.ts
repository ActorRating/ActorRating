import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type PaidFunnelRow = {
  key: string
  pageviews: number
  ratings: number
  signups: number
  repeatRaters: number
}

function num(value: bigint | number | null | undefined): number {
  if (typeof value === "bigint") return Number(value)
  return value ?? 0
}

/**
 * Paid-ad funnel keyed by utm_campaign or utm_term.
 * Pageviews are human hits. Ratings are first-touch stamps on Rating.
 * Signups / repeat raters come from User.signupUtm* set at account creation.
 */
export async function getPaidAttributionFunnel(days = 30): Promise<{
  days: number
  byCampaign: PaidFunnelRow[]
  byTerm: PaidFunnelRow[]
}> {
  const interval = Prisma.raw(`INTERVAL '${Math.min(Math.max(days, 1), 90)} days'`)

  const [campaignViews, campaignRatings, campaignUsers, termViews, termRatings, termUsers] =
    await Promise.all([
      prisma.$queryRaw<Array<{ key: string; pageviews: bigint }>>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM("utmCampaign"), ''), '(none)') AS key,
               COUNT(*)::bigint AS pageviews
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND "utmCampaign" IS NOT NULL
          AND BTRIM("utmCampaign") <> ''
        GROUP BY 1
        ORDER BY pageviews DESC
        LIMIT 40
      `),
      prisma.$queryRaw<Array<{ key: string; ratings: bigint }>>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM("utmCampaign"), ''), '(none)') AS key,
               COUNT(*)::bigint AS ratings
        FROM "Rating"
        WHERE "createdAt" >= NOW() - ${interval}
          AND "utmCampaign" IS NOT NULL
          AND BTRIM("utmCampaign") <> ''
        GROUP BY 1
      `),
      prisma.$queryRaw<Array<{ key: string; signups: bigint; repeatRaters: bigint }>>(Prisma.sql`
        SELECT u."signupUtmCampaign" AS key,
               COUNT(*)::bigint AS signups,
               COUNT(*) FILTER (
                 WHERE (
                   SELECT COUNT(*) FROM "Rating" r WHERE r."userId" = u."id"
                 ) >= 2
               )::bigint AS "repeatRaters"
        FROM "User" u
        WHERE u."createdAt" >= NOW() - ${interval}
          AND u."signupUtmCampaign" IS NOT NULL
          AND BTRIM(u."signupUtmCampaign") <> ''
        GROUP BY 1
      `),
      prisma.$queryRaw<Array<{ key: string; pageviews: bigint }>>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM("utmTerm"), ''), '(none)') AS key,
               COUNT(*)::bigint AS pageviews
        FROM "PageView"
        WHERE "isLikelyBot" = false
          AND "createdAt" >= NOW() - ${interval}
          AND "utmTerm" IS NOT NULL
          AND BTRIM("utmTerm") <> ''
        GROUP BY 1
        ORDER BY pageviews DESC
        LIMIT 40
      `),
      prisma.$queryRaw<Array<{ key: string; ratings: bigint }>>(Prisma.sql`
        SELECT COALESCE(NULLIF(BTRIM("utmTerm"), ''), '(none)') AS key,
               COUNT(*)::bigint AS ratings
        FROM "Rating"
        WHERE "createdAt" >= NOW() - ${interval}
          AND "utmTerm" IS NOT NULL
          AND BTRIM("utmTerm") <> ''
        GROUP BY 1
      `),
      prisma.$queryRaw<Array<{ key: string; signups: bigint; repeatRaters: bigint }>>(Prisma.sql`
        SELECT u."signupUtmTerm" AS key,
               COUNT(*)::bigint AS signups,
               COUNT(*) FILTER (
                 WHERE (
                   SELECT COUNT(*) FROM "Rating" r WHERE r."userId" = u."id"
                 ) >= 2
               )::bigint AS "repeatRaters"
        FROM "User" u
        WHERE u."createdAt" >= NOW() - ${interval}
          AND u."signupUtmTerm" IS NOT NULL
          AND BTRIM(u."signupUtmTerm") <> ''
        GROUP BY 1
      `),
    ])

  return {
    days,
    byCampaign: mergeRows(campaignViews, campaignRatings, campaignUsers),
    byTerm: mergeRows(termViews, termRatings, termUsers),
  }
}

function mergeRows(
  views: Array<{ key: string; pageviews: bigint }>,
  ratings: Array<{ key: string; ratings: bigint }>,
  users: Array<{ key: string; signups: bigint; repeatRaters: bigint }>,
): PaidFunnelRow[] {
  const map = new Map<string, PaidFunnelRow>()
  const ensure = (key: string) => {
    const existing = map.get(key)
    if (existing) return existing
    const row: PaidFunnelRow = {
      key,
      pageviews: 0,
      ratings: 0,
      signups: 0,
      repeatRaters: 0,
    }
    map.set(key, row)
    return row
  }
  for (const row of views) ensure(row.key).pageviews = num(row.pageviews)
  for (const row of ratings) ensure(row.key).ratings = num(row.ratings)
  for (const row of users) {
    const target = ensure(row.key)
    target.signups = num(row.signups)
    target.repeatRaters = num(row.repeatRaters)
  }
  return [...map.values()].sort((a, b) => b.pageviews - a.pageviews || b.signups - a.signups)
}
