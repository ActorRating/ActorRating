/**
 * Bayesian ranking for movie best-performances hubs.
 *
 * DISPLAY uses plain community avg10 + signed-in count (rate-page rule).
 * sortScore is ordering-only:
 *   sortScore = (n/(n+m))*avg10 + (m/(n+m))*C
 * with m=5, C = mean avg10 of roles with n>=1 (else 7.0).
 * n=0 sorts after all n>=1. Ties: higher n, then LEAD→SUPPORTING→MINOR, then billing order.
 */

export const BAYESIAN_M = 5
export const BAYESIAN_PRIOR_FALLBACK = 7.0

export type HubTier = "LEAD" | "SUPPORTING" | "MINOR" | string | null

export type RankablePerformance = {
  performanceId: string
  actorId: string
  actorName: string
  actorSlug: string | null
  character: string | null
  tier: HubTier
  order: number | null
  /** Plain community avg10 (rate-page rule); null when count === 0 */
  avg10: number | null
  /** Signed-in rating count */
  count: number
}

export type RankedPerformance = RankablePerformance & {
  sortScore: number | null
}

function tierRank(tier: HubTier): number {
  if (tier === "LEAD") return 0
  if (tier === "SUPPORTING") return 1
  if (tier === "MINOR") return 2
  return 3
}

/** Mean of avg10 among roles with at least one signed-in rating; else 7.0. */
export function bayesianPriorC(
  roles: Array<{ avg10: number | null; count: number }>,
): number {
  const scored = roles.filter(
    (r) => r.count >= 1 && typeof r.avg10 === "number" && Number.isFinite(r.avg10),
  )
  if (scored.length === 0) return BAYESIAN_PRIOR_FALLBACK
  const sum = scored.reduce((s, r) => s + (r.avg10 as number), 0)
  return sum / scored.length
}

export function bayesianSortScore(
  avg10: number | null,
  count: number,
  c: number,
  m: number = BAYESIAN_M,
): number | null {
  if (count <= 0 || avg10 == null || !Number.isFinite(avg10)) return null
  return (count / (count + m)) * avg10 + (m / (count + m)) * c
}

function compareRanked(a: RankedPerformance, b: RankedPerformance): number {
  const aRated = a.count >= 1 ? 1 : 0
  const bRated = b.count >= 1 ? 1 : 0
  if (bRated !== aRated) return bRated - aRated

  if (aRated && bRated) {
    const aScore = a.sortScore ?? -Infinity
    const bScore = b.sortScore ?? -Infinity
    if (bScore !== aScore) return bScore - aScore
  }

  if (b.count !== a.count) return b.count - a.count

  const tr = tierRank(a.tier) - tierRank(b.tier)
  if (tr !== 0) return tr

  const ao = a.order ?? Number.POSITIVE_INFINITY
  const bo = b.order ?? Number.POSITIVE_INFINITY
  if (ao !== bo) return ao - bo

  return a.actorName.localeCompare(b.actorName)
}

/** Sort LEAD/SUPPORTING (or any list) by Bayesian sortScore + tiebreaks. */
export function rankPerformances(
  roles: RankablePerformance[],
  options?: { m?: number; c?: number },
): RankedPerformance[] {
  const m = options?.m ?? BAYESIAN_M
  const c = options?.c ?? bayesianPriorC(roles)
  const ranked: RankedPerformance[] = roles.map((r) => ({
    ...r,
    sortScore: bayesianSortScore(r.avg10, r.count, c, m),
  }))
  return ranked.sort(compareRanked)
}

/** MINOR full-cast order: billing order, then name (no Bayesian). */
export function sortFullCastMinors(roles: RankablePerformance[]): RankablePerformance[] {
  return [...roles].sort((a, b) => {
    const ao = a.order ?? Number.POSITIVE_INFINITY
    const bo = b.order ?? Number.POSITIVE_INFINITY
    if (ao !== bo) return ao - bo
    return a.actorName.localeCompare(b.actorName)
  })
}

export const RANKING_PLAIN_SENTENCE =
  "Roles are ranked by a community score that pulls toward the film average until enough ratings come in, so a single 10 can’t beat a well-rated role."
