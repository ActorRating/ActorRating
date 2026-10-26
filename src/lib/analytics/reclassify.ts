import type { PrismaClient } from "@prisma/client"
import { Prisma } from "@prisma/client"

/**
 * Nightly retro-classification of UNKNOWN pageviews.
 *
 * A visitor (ar_vid) that produced many pageviews and never showed a single
 * positive signal — no engaged pageview, no dwell+interaction, never signed in,
 * no product event — is a headless client, not an undecided human. Flag all of
 * its non-bot pageviews in the lookback as UNIDENTIFIED bot with
 * botReason = RECLASSIFY_REASON. If the visitor later proves human, the pageview
 * route's exemption path unflags these rows again (see internal-crawl.ts).
 *
 * Rows younger than `settleMs` are skipped so dwell / qualified_visit beacons
 * have time to land. Visitor-less (legacy) rows are never touched: they had no
 * chance to prove anything.
 */

export const RECLASSIFY_REASON = "reclassified_no_engagement"
export const RECLASSIFY_DEFAULT_LOOKBACK_MS = 48 * 60 * 60 * 1000
export const RECLASSIFY_DEFAULT_SETTLE_MS = 2 * 60 * 60 * 1000
export const RECLASSIFY_DEFAULT_MIN_PAGEVIEWS = 5

export type ReclassifyOptions = {
  lookbackMs?: number
  settleMs?: number
  minPageviews?: number
  dryRun?: boolean
}

export type ReclassifyResult = {
  candidateVisitors: number
  flaggedPageviews: number
  dryRun: boolean
}

type CandidateRow = { visitorId: string; pageviews: bigint | number }

/** Pure: decide whether a visitor summary qualifies for reclassification. */
export function visitorQualifiesForReclassify(input: {
  pageviews: number
  anyEngaged: boolean
  anyDwellInteraction: boolean
  anySignedIn: boolean
  anyProofEvent: boolean
  minPageviews?: number
}): boolean {
  const min = input.minPageviews ?? RECLASSIFY_DEFAULT_MIN_PAGEVIEWS
  if (input.pageviews < min) return false
  return !(
    input.anyEngaged ||
    input.anyDwellInteraction ||
    input.anySignedIn ||
    input.anyProofEvent
  )
}

export async function reclassifyUnknownPageViews(
  prisma: PrismaClient,
  opts: ReclassifyOptions = {},
): Promise<ReclassifyResult> {
  const lookbackMs = opts.lookbackMs ?? RECLASSIFY_DEFAULT_LOOKBACK_MS
  const settleMs = opts.settleMs ?? RECLASSIFY_DEFAULT_SETTLE_MS
  const minPageviews = opts.minPageviews ?? RECLASSIFY_DEFAULT_MIN_PAGEVIEWS
  const since = new Date(Date.now() - lookbackMs)
  const until = new Date(Date.now() - settleMs)

  const candidates = await prisma.$queryRaw<CandidateRow[]>(Prisma.sql`
    WITH v AS (
      SELECT "visitorId",
             COUNT(*) FILTER (WHERE "isLikelyBot" = false) AS nonbot_pageviews,
             BOOL_OR("engaged") AS any_engaged,
             BOOL_OR("dwellMs" >= 5000 AND "interaction" IS NOT NULL) AS any_dwell_interaction,
             BOOL_OR("userId" IS NOT NULL) AS any_signed_in
      FROM "PageView"
      WHERE "visitorId" IS NOT NULL
        AND "createdAt" >= ${since}
        AND "createdAt" < ${until}
        AND "path" NOT LIKE '/admin%'
      GROUP BY "visitorId"
    )
    SELECT v."visitorId", v.nonbot_pageviews::bigint AS pageviews
    FROM v
    WHERE v.nonbot_pageviews >= ${minPageviews}
      AND NOT v.any_engaged
      AND NOT v.any_dwell_interaction
      AND NOT v.any_signed_in
      AND NOT EXISTS (
        SELECT 1 FROM "ProductEvent" pe
        WHERE pe."visitorId" = v."visitorId"
          AND pe."createdAt" >= ${since}
          AND pe."isLikelyBot" = false
      )
  `)

  const visitorIds = candidates.map((c) => c.visitorId)
  if (visitorIds.length === 0 || opts.dryRun) {
    return {
      candidateVisitors: visitorIds.length,
      flaggedPageviews: candidates.reduce((n, c) => n + Number(c.pageviews), 0),
      dryRun: Boolean(opts.dryRun),
    }
  }

  let flagged = 0
  const CHUNK = 500
  for (let i = 0; i < visitorIds.length; i += CHUNK) {
    const chunk = visitorIds.slice(i, i + CHUNK)
    const res = await prisma.pageView.updateMany({
      where: {
        visitorId: { in: chunk },
        isLikelyBot: false,
        createdAt: { gte: since, lt: until },
      },
      data: {
        isLikelyBot: true,
        botCategory: "UNIDENTIFIED",
        botReason: RECLASSIFY_REASON,
      },
    })
    flagged += res.count
  }

  return { candidateVisitors: visitorIds.length, flaggedPageviews: flagged, dryRun: false }
}
