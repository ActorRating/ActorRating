import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/admin/cache"
import { adminVisibleUserEmailSql, isAdminHiddenUserEmail } from "@/lib/admin/hidden-users"

/**
 * Named in scripts/cleanup-demo-data.ts and scripts/seed-performances.ts.
 * These are not on the admin hidden-email list, so they are matched separately.
 */
export const SCRIPT_DEMO_EMAILS = ["demo@local.test", "seed_user@example.com"] as const

/** Named in scripts/cleanup-demo-data.ts as the demo rating slug. */
export const DEMO_RATING_SLUG = "demo-123"

const CACHE_KEY = "admin:rating-distribution:v1"
const CACHE_TTL_MS = 60_000

export type RatingExclusionKind = "seed-domain" | "script-demo" | "admin-hidden" | "demo-slug"

export type RatingDistributionReport = {
  totalRatings: number
  signedInRatings: number
  guestRatings: number
  distinctActors: number
  distinctPairs: number
  pairsAtLeast5: number
  pairsAtLeast10: number
  pairsAtLeast25: number
  signedInAccounts: number
  top1Ratings: number
  top3Ratings: number
  top5Ratings: number
  top1PercentOfAll: number | null
  top3PercentOfAll: number | null
  top5PercentOfAll: number | null
  seedDomainRatings: number
  scriptDemoRatings: number
  adminHiddenOtherRatings: number
  demoSlugRatings: number
  excludedRatings: number
  remainingRatings: number
  remainingSignedIn: number
  remainingGuest: number
  remainingDistinctActors: number
  remainingDistinctPairs: number
  remainingPairsAtLeast5: number
  remainingPairsAtLeast10: number
  remainingPairsAtLeast25: number
  remainingSignedInAccounts: number
  remainingTop1Ratings: number
  remainingTop3Ratings: number
  remainingTop5Ratings: number
  remainingTop1PercentOfRemaining: number | null
  remainingTop3PercentOfRemaining: number | null
  remainingTop5PercentOfRemaining: number | null
}

type AggregateRow = {
  totalRatings: number
  signedInRatings: number
  guestRatings: number
  distinctActors: number
  distinctPairs: number
  pairsAtLeast5: number
  pairsAtLeast10: number
  pairsAtLeast25: number
  signedInAccounts: number
  top1Ratings: number
  top3Ratings: number
  top5Ratings: number
  seedDomainRatings: number
  scriptDemoRatings: number
  adminHiddenOtherRatings: number
  demoSlugRatings: number
  excludedRatings: number
  remainingRatings: number
  remainingSignedIn: number
  remainingGuest: number
  remainingDistinctActors: number
  remainingDistinctPairs: number
  remainingPairsAtLeast5: number
  remainingPairsAtLeast10: number
  remainingPairsAtLeast25: number
  remainingSignedInAccounts: number
  remainingTop1Ratings: number
  remainingTop3Ratings: number
  remainingTop5Ratings: number
}

function toNumber(value: bigint | number | null | undefined) {
  if (typeof value === "bigint") return Number(value)
  if (typeof value === "number") return value
  return 0
}

/** Share of `total` Rating rows. Null when there are no rows to divide by. */
export function percentOfTotal(part: number, total: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0 || part < 0) return null
  return Math.round((part / total) * 1000) / 10
}

/**
 * Why a Rating row is left out of the "after exclusion" counts.
 * A row can match more than one rule. An empty list means it is kept.
 * Admin-hidden personal emails are not labeled seed or demo.
 */
export function classifyRatingExclusion(input: {
  email: string | null
  slug: string | null
}): RatingExclusionKind[] {
  const email = input.email?.trim().toLowerCase() ?? ""
  const kinds: RatingExclusionKind[] = []
  if (email.endsWith("@actorrating.local")) kinds.push("seed-domain")
  if ((SCRIPT_DEMO_EMAILS as readonly string[]).includes(email)) kinds.push("script-demo")
  if (
    isAdminHiddenUserEmail(email) &&
    !email.endsWith("@actorrating.local") &&
    !(SCRIPT_DEMO_EMAILS as readonly string[]).includes(email)
  ) {
    kinds.push("admin-hidden")
  }
  if (input.slug === DEMO_RATING_SLUG) kinds.push("demo-slug")
  return kinds
}

export function reportFromAggregates(row: AggregateRow): RatingDistributionReport {
  const num = (value: number) => toNumber(value)
  const total = num(row.totalRatings)
  const remaining = num(row.remainingRatings)
  return {
    totalRatings: total,
    signedInRatings: num(row.signedInRatings),
    guestRatings: num(row.guestRatings),
    distinctActors: num(row.distinctActors),
    distinctPairs: num(row.distinctPairs),
    pairsAtLeast5: num(row.pairsAtLeast5),
    pairsAtLeast10: num(row.pairsAtLeast10),
    pairsAtLeast25: num(row.pairsAtLeast25),
    signedInAccounts: num(row.signedInAccounts),
    top1Ratings: num(row.top1Ratings),
    top3Ratings: num(row.top3Ratings),
    top5Ratings: num(row.top5Ratings),
    top1PercentOfAll: percentOfTotal(num(row.top1Ratings), total),
    top3PercentOfAll: percentOfTotal(num(row.top3Ratings), total),
    top5PercentOfAll: percentOfTotal(num(row.top5Ratings), total),
    seedDomainRatings: num(row.seedDomainRatings),
    scriptDemoRatings: num(row.scriptDemoRatings),
    adminHiddenOtherRatings: num(row.adminHiddenOtherRatings),
    demoSlugRatings: num(row.demoSlugRatings),
    excludedRatings: num(row.excludedRatings),
    remainingRatings: remaining,
    remainingSignedIn: num(row.remainingSignedIn),
    remainingGuest: num(row.remainingGuest),
    remainingDistinctActors: num(row.remainingDistinctActors),
    remainingDistinctPairs: num(row.remainingDistinctPairs),
    remainingPairsAtLeast5: num(row.remainingPairsAtLeast5),
    remainingPairsAtLeast10: num(row.remainingPairsAtLeast10),
    remainingPairsAtLeast25: num(row.remainingPairsAtLeast25),
    remainingSignedInAccounts: num(row.remainingSignedInAccounts),
    remainingTop1Ratings: num(row.remainingTop1Ratings),
    remainingTop3Ratings: num(row.remainingTop3Ratings),
    remainingTop5Ratings: num(row.remainingTop5Ratings),
    remainingTop1PercentOfRemaining: percentOfTotal(num(row.remainingTop1Ratings), remaining),
    remainingTop3PercentOfRemaining: percentOfTotal(num(row.remainingTop3Ratings), remaining),
    remainingTop5PercentOfRemaining: percentOfTotal(num(row.remainingTop5Ratings), remaining),
  }
}

export async function getRatingDistribution(): Promise<RatingDistributionReport | null> {
  const cached = getCache<RatingDistributionReport>(CACHE_KEY)
  if (cached) return cached

  const scriptEmails = SCRIPT_DEMO_EMAILS.map((email) => Prisma.sql`${email}`)
  try {
    const rows = await prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
      WITH base AS (
        SELECT
          r."userId",
          r."actorId",
          r."movieId",
          (r."userId" IS NULL) AS is_guest,
          (r."slug" = ${DEMO_RATING_SLUG}) AS is_demo_slug,
          (u."id" IS NOT NULL AND LOWER(u."email") LIKE '%@actorrating.local') AS is_seed_domain,
          (u."id" IS NOT NULL AND LOWER(u."email") IN (${Prisma.join(scriptEmails)})) AS is_script_demo,
          (
            u."id" IS NOT NULL
            AND NOT (${adminVisibleUserEmailSql("u.email")})
          ) AS is_admin_hidden
        FROM "Rating" r
        LEFT JOIN "User" u ON u."id" = r."userId"
      ),
      flagged AS (
        SELECT
          *,
          (
            is_demo_slug
            OR is_seed_domain
            OR is_script_demo
            OR is_admin_hidden
          ) AS excluded,
          (is_admin_hidden AND NOT is_seed_domain AND NOT is_script_demo) AS is_admin_hidden_other
        FROM base
      ),
      kept AS (
        SELECT * FROM flagged WHERE NOT excluded
      ),
      pairs AS (
        SELECT "actorId", "movieId", COUNT(*)::int AS n
        FROM flagged
        GROUP BY "actorId", "movieId"
      ),
      kept_pairs AS (
        SELECT "actorId", "movieId", COUNT(*)::int AS n
        FROM kept
        GROUP BY "actorId", "movieId"
      ),
      signed AS (
        SELECT "userId", COUNT(*)::int AS n
        FROM flagged
        WHERE "userId" IS NOT NULL
        GROUP BY "userId"
      ),
      ranked AS (
        SELECT n, ROW_NUMBER() OVER (ORDER BY n DESC, "userId") AS rk
        FROM signed
      ),
      kept_signed AS (
        SELECT "userId", COUNT(*)::int AS n
        FROM kept
        WHERE "userId" IS NOT NULL
        GROUP BY "userId"
      ),
      kept_ranked AS (
        SELECT n, ROW_NUMBER() OVER (ORDER BY n DESC, "userId") AS rk
        FROM kept_signed
      )
      SELECT
        (SELECT COUNT(*)::int FROM flagged) AS "totalRatings",
        (SELECT COUNT(*)::int FROM flagged WHERE NOT is_guest) AS "signedInRatings",
        (SELECT COUNT(*)::int FROM flagged WHERE is_guest) AS "guestRatings",
        (SELECT COUNT(DISTINCT "actorId")::int FROM flagged) AS "distinctActors",
        (SELECT COUNT(*)::int FROM pairs) AS "distinctPairs",
        (SELECT COUNT(*)::int FROM pairs WHERE n >= 5) AS "pairsAtLeast5",
        (SELECT COUNT(*)::int FROM pairs WHERE n >= 10) AS "pairsAtLeast10",
        (SELECT COUNT(*)::int FROM pairs WHERE n >= 25) AS "pairsAtLeast25",
        (SELECT COUNT(*)::int FROM signed) AS "signedInAccounts",
        COALESCE((SELECT SUM(n)::int FROM ranked WHERE rk <= 1), 0) AS "top1Ratings",
        COALESCE((SELECT SUM(n)::int FROM ranked WHERE rk <= 3), 0) AS "top3Ratings",
        COALESCE((SELECT SUM(n)::int FROM ranked WHERE rk <= 5), 0) AS "top5Ratings",
        (SELECT COUNT(*)::int FROM flagged WHERE is_seed_domain) AS "seedDomainRatings",
        (SELECT COUNT(*)::int FROM flagged WHERE is_script_demo) AS "scriptDemoRatings",
        (SELECT COUNT(*)::int FROM flagged WHERE is_admin_hidden_other) AS "adminHiddenOtherRatings",
        (SELECT COUNT(*)::int FROM flagged WHERE is_demo_slug) AS "demoSlugRatings",
        (SELECT COUNT(*)::int FROM flagged WHERE excluded) AS "excludedRatings",
        (SELECT COUNT(*)::int FROM kept) AS "remainingRatings",
        (SELECT COUNT(*)::int FROM kept WHERE NOT is_guest) AS "remainingSignedIn",
        (SELECT COUNT(*)::int FROM kept WHERE is_guest) AS "remainingGuest",
        (SELECT COUNT(DISTINCT "actorId")::int FROM kept) AS "remainingDistinctActors",
        (SELECT COUNT(*)::int FROM kept_pairs) AS "remainingDistinctPairs",
        (SELECT COUNT(*)::int FROM kept_pairs WHERE n >= 5) AS "remainingPairsAtLeast5",
        (SELECT COUNT(*)::int FROM kept_pairs WHERE n >= 10) AS "remainingPairsAtLeast10",
        (SELECT COUNT(*)::int FROM kept_pairs WHERE n >= 25) AS "remainingPairsAtLeast25",
        (SELECT COUNT(*)::int FROM kept_signed) AS "remainingSignedInAccounts",
        COALESCE((SELECT SUM(n)::int FROM kept_ranked WHERE rk <= 1), 0) AS "remainingTop1Ratings",
        COALESCE((SELECT SUM(n)::int FROM kept_ranked WHERE rk <= 3), 0) AS "remainingTop3Ratings",
        COALESCE((SELECT SUM(n)::int FROM kept_ranked WHERE rk <= 5), 0) AS "remainingTop5Ratings"
    `)
    const row = rows[0]
    if (!row) return null
    const report = reportFromAggregates(row)
    setCache(CACHE_KEY, report, CACHE_TTL_MS)
    return report
  } catch (error) {
    console.error("Admin query failed getRatingDistribution", error)
    return null
  }
}
