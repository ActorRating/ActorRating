/** Must match `SYSTEM_USER_ID` in movie-ingestion (avoid importing that heavy module here). */
const SYSTEM_USER_ID = "uuid-from-auth-users"

export type PerformanceSeoRow = {
  tier: string | null
  seededAggregateScore?: number | null
  character?: string | null
  userId?: string | null
  order?: number | null
  createdAt?: Date | null
}

export type CanonicalPerformanceSeoMeta = {
  /** Best LEAD/SUPPORTING tier, else best remaining tier (may be MINOR). */
  tier: string | null
  seededAggregateScore: number | null
  /** All character credits for the pair (self/archive filtering). */
  characters: Array<string | null>
}

function tierRank(tier: string | null | undefined): number {
  if (tier === "LEAD" || tier === "SUPPORTING") return 0
  if (tier && tier !== "MINOR") return 1
  if (tier === "MINOR") return 2
  return 3
}

function systemRank(userId: string | null | undefined): number {
  return userId === SYSTEM_USER_ID ? 0 : 1
}

/** Stable sort key aligned with admin DISTINCT ON + LEAD/SUPPORTING preference. */
export function comparePerformanceSeoRows(a: PerformanceSeoRow, b: PerformanceSeoRow): number {
  const tr = tierRank(a.tier) - tierRank(b.tier)
  if (tr !== 0) return tr
  const sr = systemRank(a.userId) - systemRank(b.userId)
  if (sr !== 0) return sr
  const ao = a.order ?? Number.POSITIVE_INFINITY
  const bo = b.order ?? Number.POSITIVE_INFINITY
  if (ao !== bo) return ao - bo
  const at = a.createdAt?.getTime() ?? 0
  const bt = b.createdAt?.getTime() ?? 0
  return at - bt
}

/**
 * Collapse multiple Performance rows for one (actorId, movieId) into the SEO
 * canonical tier / seeded score, keeping every character credit.
 */
export function pickCanonicalPerformanceSeoMeta(
  rows: PerformanceSeoRow[],
): CanonicalPerformanceSeoMeta {
  const characters = rows.map((r) => r.character ?? null)
  if (rows.length === 0) {
    return { tier: null, seededAggregateScore: null, characters: [] }
  }
  const sorted = [...rows].sort(comparePerformanceSeoRows)
  const best = sorted[0]
  let seededAggregateScore: number | null =
    typeof best.seededAggregateScore === "number" && Number.isFinite(best.seededAggregateScore)
      ? best.seededAggregateScore
      : null
  if (seededAggregateScore == null) {
    for (const r of sorted) {
      if (typeof r.seededAggregateScore === "number" && Number.isFinite(r.seededAggregateScore)) {
        seededAggregateScore = r.seededAggregateScore
        break
      }
    }
  }
  return {
    tier: best.tier ?? null,
    seededAggregateScore,
    characters,
  }
}

/** SQL ORDER BY fragment (Postgres) matching comparePerformanceSeoRows. */
export const CANONICAL_PERF_SQL_ORDER_BY = `
  CASE
    WHEN p.tier IN ('LEAD', 'SUPPORTING') THEN 0
    WHEN p.tier IS NOT NULL AND p.tier::text <> 'MINOR' THEN 1
    WHEN p.tier = 'MINOR' THEN 2
    ELSE 3
  END,
  CASE WHEN p."userId" = '${SYSTEM_USER_ID}' THEN 0 ELSE 1 END,
  p."order" ASC NULLS LAST,
  p."createdAt" ASC
`.trim()
