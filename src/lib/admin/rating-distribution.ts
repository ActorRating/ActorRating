import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/admin/cache"
import { isAdminHiddenUserEmail } from "@/lib/admin/hidden-users"

/**
 * Named in scripts/cleanup-demo-data.ts and scripts/seed-performances.ts.
 * These are not on the admin hidden-email list, so they are matched separately.
 */
export const SCRIPT_DEMO_EMAILS = ["demo@local.test", "seed_user@example.com"] as const

/** Named in scripts/cleanup-demo-data.ts as the demo rating slug. */
export const DEMO_RATING_SLUG = "demo-123"

const CACHE_KEY = "admin:rating-distribution:v2"
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

/** One Rating row plus the account email needed to apply the exclusion rules. */
export type RatingDistributionInput = {
  userId: string | null
  email: string | null
  slug: string | null
  actorId: string
  movieId: string
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

function pairKey(actorId: string, movieId: string) {
  return `${actorId}\0${movieId}`
}

function countAtLeast(counts: Map<string, number>, minimum: number) {
  let pairs = 0
  for (const count of counts.values()) {
    if (count >= minimum) pairs += 1
  }
  return pairs
}

/** Top accounts by rating count, then user id, matching the previous SQL ordering. */
function topAccountRatings(counts: Map<string, number>, limit: number) {
  const ranked = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    if (a[0] < b[0]) return -1
    if (a[0] > b[0]) return 1
    return 0
  })
  let total = 0
  for (const [, count] of ranked.slice(0, limit)) total += count
  return total
}

/**
 * Count every Rating row once. A null slug is not an exclusion: SQL `slug = 'demo-123'`
 * is unknown when slug is null, and `NOT (unknown OR false)` dropped every unflagged row.
 */
export function aggregateRatingDistribution(
  rows: RatingDistributionInput[],
): RatingDistributionReport {
  const actors = new Set<string>()
  const pairs = new Map<string, number>()
  const signedIn = new Map<string, number>()
  const remainingActors = new Set<string>()
  const remainingPairs = new Map<string, number>()
  const remainingSignedInAccounts = new Map<string, number>()

  let signedInRatings = 0
  let guestRatings = 0
  let seedDomainRatings = 0
  let scriptDemoRatings = 0
  let adminHiddenOtherRatings = 0
  let demoSlugRatings = 0
  let excludedRatings = 0
  let remainingSignedIn = 0
  let remainingGuest = 0

  for (const row of rows) {
    const guest = row.userId == null
    if (guest) guestRatings += 1
    else signedInRatings += 1

    actors.add(row.actorId)
    const key = pairKey(row.actorId, row.movieId)
    pairs.set(key, (pairs.get(key) ?? 0) + 1)
    if (row.userId != null) {
      signedIn.set(row.userId, (signedIn.get(row.userId) ?? 0) + 1)
    }

    const kinds = classifyRatingExclusion({ email: row.email, slug: row.slug })
    if (kinds.includes("seed-domain")) seedDomainRatings += 1
    if (kinds.includes("script-demo")) scriptDemoRatings += 1
    if (kinds.includes("admin-hidden")) adminHiddenOtherRatings += 1
    if (kinds.includes("demo-slug")) demoSlugRatings += 1
    if (kinds.length > 0) {
      excludedRatings += 1
      continue
    }

    if (row.userId == null) {
      remainingGuest += 1
    } else {
      remainingSignedIn += 1
      remainingSignedInAccounts.set(
        row.userId,
        (remainingSignedInAccounts.get(row.userId) ?? 0) + 1,
      )
    }
    remainingActors.add(row.actorId)
    remainingPairs.set(key, (remainingPairs.get(key) ?? 0) + 1)
  }

  return reportFromAggregates({
    totalRatings: rows.length,
    signedInRatings,
    guestRatings,
    distinctActors: actors.size,
    distinctPairs: pairs.size,
    pairsAtLeast5: countAtLeast(pairs, 5),
    pairsAtLeast10: countAtLeast(pairs, 10),
    pairsAtLeast25: countAtLeast(pairs, 25),
    signedInAccounts: signedIn.size,
    top1Ratings: topAccountRatings(signedIn, 1),
    top3Ratings: topAccountRatings(signedIn, 3),
    top5Ratings: topAccountRatings(signedIn, 5),
    seedDomainRatings,
    scriptDemoRatings,
    adminHiddenOtherRatings,
    demoSlugRatings,
    excludedRatings,
    remainingRatings: remainingSignedIn + remainingGuest,
    remainingSignedIn,
    remainingGuest,
    remainingDistinctActors: remainingActors.size,
    remainingDistinctPairs: remainingPairs.size,
    remainingPairsAtLeast5: countAtLeast(remainingPairs, 5),
    remainingPairsAtLeast10: countAtLeast(remainingPairs, 10),
    remainingPairsAtLeast25: countAtLeast(remainingPairs, 25),
    remainingSignedInAccounts: remainingSignedInAccounts.size,
    remainingTop1Ratings: topAccountRatings(remainingSignedInAccounts, 1),
    remainingTop3Ratings: topAccountRatings(remainingSignedInAccounts, 3),
    remainingTop5Ratings: topAccountRatings(remainingSignedInAccounts, 5),
  })
}

type RatingDistributionQueryRow = {
  userId: string | null
  email: string | null
  slug: string | null
  actorId: string
  movieId: string
}

export async function getRatingDistribution(): Promise<RatingDistributionReport | null> {
  const cached = getCache<RatingDistributionReport>(CACHE_KEY)
  if (cached) return cached

  try {
    const rows = await prisma.$queryRaw<RatingDistributionQueryRow[]>(Prisma.sql`
      SELECT
        r."userId" AS "userId",
        u."email" AS "email",
        r."slug" AS "slug",
        r."actorId" AS "actorId",
        r."movieId" AS "movieId"
      FROM "Rating" r
      LEFT JOIN "User" u ON u."id" = r."userId"
    `)
    const report = aggregateRatingDistribution(rows)
    setCache(CACHE_KEY, report, CACHE_TTL_MS)
    return report
  } catch (error) {
    console.error("Admin query failed getRatingDistribution", error)
    return null
  }
}
