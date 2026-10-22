import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/admin/cache"
import type { PageViewAnalyticsDays } from "@/lib/admin/getPageViewAnalytics"
import {
  emptyValuableRaterMetrics,
  GUEST_IDENTITY_NOTE,
  type ValuableRaterChannelRow,
  type ValuableRaterMetrics,
} from "@/lib/admin/valuable-raters"

function toNumber(value: bigint | number | null | undefined): number {
  if (typeof value === "bigint") return Number(value)
  return value ?? 0
}

function intervalForDays(days: PageViewAnalyticsDays): Prisma.Sql {
  if (days === 1) return Prisma.raw(`INTERVAL '24 hours'`)
  if (days === 30) return Prisma.raw(`INTERVAL '29 days'`)
  return Prisma.raw(`INTERVAL '6 days'`)
}

type CountRow = { count: bigint | number }
type ChannelRow = {
  key: string
  new_raters: bigint | number
  engaged_raters: bigint | number
  returning_raters: bigint | number
}

function mapChannel(rows: ChannelRow[]): ValuableRaterChannelRow[] {
  return rows.map((r) => ({
    key: r.key || "(none)",
    newRaters: toNumber(r.new_raters),
    engagedRaters: toNumber(r.engaged_raters),
    returningRaters: toNumber(r.returning_raters),
  }))
}

/**
 * New / engaged / returning raters for the analytics window.
 * Engaged & returning are cohorts whose first-ever rating falls in the window.
 */
export async function getValuableRaterMetrics(
  days: PageViewAnalyticsDays = 7,
): Promise<ValuableRaterMetrics> {
  const cacheKey = `admin:valuable-raters:v1:${days}`
  const cached = getCache<ValuableRaterMetrics>(cacheKey)
  if (cached) return cached

  const interval = intervalForDays(days)

  try {
    const [newRows, engagedRows, returningRows, bySource, byCampaign] =
      await Promise.all([
        prisma.$queryRaw<CountRow[]>(Prisma.sql`
          SELECT COUNT(DISTINCT rater)::bigint AS count
          FROM (
            SELECT
              CASE
                WHEN "userId" IS NOT NULL THEN 'u:' || "userId"
                ELSE 'a:' || "anonId"
              END AS rater
            FROM "Rating"
            WHERE "createdAt" >= NOW() - ${interval}
              AND ("userId" IS NOT NULL OR "anonId" IS NOT NULL)
          ) t
        `),
        prisma.$queryRaw<CountRow[]>(Prisma.sql`
          WITH keyed AS (
            SELECT
              CASE
                WHEN "userId" IS NOT NULL THEN 'u:' || "userId"
                ELSE 'a:' || "anonId"
              END AS rater,
              "createdAt"
            FROM "Rating"
            WHERE ("userId" IS NOT NULL OR "anonId" IS NOT NULL)
          ),
          firsts AS (
            SELECT rater, MIN("createdAt") AS first_at
            FROM keyed
            GROUP BY rater
          ),
          cohort AS (
            SELECT f.rater, f.first_at
            FROM firsts f
            WHERE f.first_at >= NOW() - ${interval}
          )
          SELECT COUNT(*)::bigint AS count
          FROM cohort c
          WHERE (
            SELECT COUNT(*) FROM keyed k
            WHERE k.rater = c.rater
              AND k."createdAt" >= c.first_at
              AND k."createdAt" < c.first_at + INTERVAL '7 days'
          ) >= 3
        `),
        prisma.$queryRaw<CountRow[]>(Prisma.sql`
          WITH keyed AS (
            SELECT
              CASE
                WHEN "userId" IS NOT NULL THEN 'u:' || "userId"
                ELSE 'a:' || "anonId"
              END AS rater,
              "createdAt"
            FROM "Rating"
            WHERE ("userId" IS NOT NULL OR "anonId" IS NOT NULL)
          ),
          firsts AS (
            SELECT rater, MIN("createdAt") AS first_at
            FROM keyed
            GROUP BY rater
          ),
          cohort AS (
            SELECT f.rater, f.first_at
            FROM firsts f
            WHERE f.first_at >= NOW() - ${interval}
          )
          SELECT COUNT(*)::bigint AS count
          FROM cohort c
          WHERE (
            SELECT COUNT(DISTINCT (k."createdAt" AT TIME ZONE 'UTC')::date)
            FROM keyed k
            WHERE k.rater = c.rater
              AND k."createdAt" >= c.first_at
              AND k."createdAt" < c.first_at + INTERVAL '21 days'
          ) >= 2
        `),
        prisma.$queryRaw<ChannelRow[]>(Prisma.sql`
          WITH keyed AS (
            SELECT
              CASE
                WHEN "userId" IS NOT NULL THEN 'u:' || "userId"
                ELSE 'a:' || "anonId"
              END AS rater,
              "createdAt",
              "utmSource",
              "utmCampaign"
            FROM "Rating"
            WHERE ("userId" IS NOT NULL OR "anonId" IS NOT NULL)
          ),
          firsts AS (
            SELECT
              rater,
              MIN("createdAt") AS first_at,
              (array_agg("utmSource" ORDER BY "createdAt"))[1] AS utm_source
            FROM keyed
            GROUP BY rater
          ),
          new_in_window AS (
            SELECT DISTINCT
              k.rater,
              COALESCE(NULLIF(BTRIM(f.utm_source), ''), '(none)') AS key
            FROM keyed k
            JOIN firsts f ON f.rater = k.rater
            WHERE k."createdAt" >= NOW() - ${interval}
          ),
          engaged AS (
            SELECT
              c.rater,
              COALESCE(NULLIF(BTRIM(c.utm_source), ''), '(none)') AS key
            FROM firsts c
            WHERE c.first_at >= NOW() - ${interval}
              AND (
                SELECT COUNT(*) FROM keyed k
                WHERE k.rater = c.rater
                  AND k."createdAt" >= c.first_at
                  AND k."createdAt" < c.first_at + INTERVAL '7 days'
              ) >= 3
          ),
          returning AS (
            SELECT
              c.rater,
              COALESCE(NULLIF(BTRIM(c.utm_source), ''), '(none)') AS key
            FROM firsts c
            WHERE c.first_at >= NOW() - ${interval}
              AND (
                SELECT COUNT(DISTINCT (k."createdAt" AT TIME ZONE 'UTC')::date)
                FROM keyed k
                WHERE k.rater = c.rater
                  AND k."createdAt" >= c.first_at
                  AND k."createdAt" < c.first_at + INTERVAL '21 days'
              ) >= 2
          ),
          keys AS (
            SELECT key FROM new_in_window
            UNION
            SELECT key FROM engaged
            UNION
            SELECT key FROM returning
          )
          SELECT
            k.key,
            (SELECT COUNT(*) FROM new_in_window n WHERE n.key = k.key)::bigint AS new_raters,
            (SELECT COUNT(*) FROM engaged e WHERE e.key = k.key)::bigint AS engaged_raters,
            (SELECT COUNT(*) FROM returning r WHERE r.key = k.key)::bigint AS returning_raters
          FROM keys k
          ORDER BY new_raters DESC, engaged_raters DESC
          LIMIT 25
        `),
        prisma.$queryRaw<ChannelRow[]>(Prisma.sql`
          WITH keyed AS (
            SELECT
              CASE
                WHEN "userId" IS NOT NULL THEN 'u:' || "userId"
                ELSE 'a:' || "anonId"
              END AS rater,
              "createdAt",
              "utmCampaign"
            FROM "Rating"
            WHERE ("userId" IS NOT NULL OR "anonId" IS NOT NULL)
          ),
          firsts AS (
            SELECT
              rater,
              MIN("createdAt") AS first_at,
              (array_agg("utmCampaign" ORDER BY "createdAt"))[1] AS utm_campaign
            FROM keyed
            GROUP BY rater
          ),
          new_in_window AS (
            SELECT DISTINCT
              k.rater,
              COALESCE(NULLIF(BTRIM(f.utm_campaign), ''), '(none)') AS key
            FROM keyed k
            JOIN firsts f ON f.rater = k.rater
            WHERE k."createdAt" >= NOW() - ${interval}
          ),
          engaged AS (
            SELECT
              c.rater,
              COALESCE(NULLIF(BTRIM(c.utm_campaign), ''), '(none)') AS key
            FROM firsts c
            WHERE c.first_at >= NOW() - ${interval}
              AND (
                SELECT COUNT(*) FROM keyed k
                WHERE k.rater = c.rater
                  AND k."createdAt" >= c.first_at
                  AND k."createdAt" < c.first_at + INTERVAL '7 days'
              ) >= 3
          ),
          returning AS (
            SELECT
              c.rater,
              COALESCE(NULLIF(BTRIM(c.utm_campaign), ''), '(none)') AS key
            FROM firsts c
            WHERE c.first_at >= NOW() - ${interval}
              AND (
                SELECT COUNT(DISTINCT (k."createdAt" AT TIME ZONE 'UTC')::date)
                FROM keyed k
                WHERE k.rater = c.rater
                  AND k."createdAt" >= c.first_at
                  AND k."createdAt" < c.first_at + INTERVAL '21 days'
              ) >= 2
          ),
          keys AS (
            SELECT key FROM new_in_window
            UNION
            SELECT key FROM engaged
            UNION
            SELECT key FROM returning
          )
          SELECT
            k.key,
            (SELECT COUNT(*) FROM new_in_window n WHERE n.key = k.key)::bigint AS new_raters,
            (SELECT COUNT(*) FROM engaged e WHERE e.key = k.key)::bigint AS engaged_raters,
            (SELECT COUNT(*) FROM returning r WHERE r.key = k.key)::bigint AS returning_raters
          FROM keys k
          ORDER BY new_raters DESC, engaged_raters DESC
          LIMIT 25
        `),
      ])

    const data: ValuableRaterMetrics = {
      newRaters: toNumber(newRows[0]?.count),
      engagedRaters: toNumber(engagedRows[0]?.count),
      returningRaters: toNumber(returningRows[0]?.count),
      bySource: mapChannel(bySource),
      byCampaign: mapChannel(byCampaign),
      guestIdentityNote: GUEST_IDENTITY_NOTE,
    }
    setCache(cacheKey, data, 30_000)
    return data
  } catch (error) {
    console.error("Admin query failed getValuableRaterMetrics", error)
    return emptyValuableRaterMetrics()
  }
}
