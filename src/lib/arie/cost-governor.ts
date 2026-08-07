import { Prisma, type ArieUsageProvider } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  arieCostGovernorEnabled,
  arieMonthlyBudgetUsd,
  currentBudgetPeriodKey,
} from "@/lib/arie/config"
import { arieLog } from "@/lib/arie/log"

export type CostBand =
  | "normal"
  | "prefer_priority"
  | "high_or_bump"
  | "score_85"
  | "exceptional"
  | "stopped"

export type GovernorSnapshot = {
  enabled: boolean
  periodKey: string
  budgetUsd: number
  spentUsd: number
  usedRatio: number
  band: CostBand
  /** Effective minimum Opportunity Score for paid generation. */
  minOpportunityScore: number
  allowPaidCalls: boolean
}

function bandFromRatio(ratio: number): CostBand {
  if (ratio >= 1) return "stopped"
  if (ratio >= 0.9) return "exceptional"
  if (ratio >= 0.75) return "score_85"
  if (ratio >= 0.5) return "high_or_bump"
  if (ratio >= 0.25) return "prefer_priority"
  return "normal"
}

function minScoreForBand(band: CostBand, baseThreshold = 70): number {
  switch (band) {
    case "normal":
      return baseThreshold
    case "prefer_priority":
      return baseThreshold + 5
    case "high_or_bump":
      return baseThreshold + 10
    case "score_85":
      return 85
    case "exceptional":
      return 90
    case "stopped":
      return 101
  }
}

export async function getGovernorSnapshot(
  baseThreshold = 70,
): Promise<GovernorSnapshot> {
  const enabled = arieCostGovernorEnabled()
  const periodKey = currentBudgetPeriodKey()
  const budgetUsd = arieMonthlyBudgetUsd()

  if (!enabled) {
    return {
      enabled: false,
      periodKey,
      budgetUsd,
      spentUsd: 0,
      usedRatio: 0,
      band: "normal",
      minOpportunityScore: baseThreshold,
      allowPaidCalls: true,
    }
  }

  const agg = await prisma.arieUsageRecord.aggregate({
    where: { periodKey },
    _sum: { estimatedCostUsd: true },
  })
  const spentUsd = Number(agg._sum.estimatedCostUsd ?? 0)
  const usedRatio = budgetUsd > 0 ? spentUsd / budgetUsd : 1
  const band = bandFromRatio(usedRatio)

  return {
    enabled: true,
    periodKey,
    budgetUsd,
    spentUsd,
    usedRatio,
    band,
    minOpportunityScore: minScoreForBand(band, baseThreshold),
    allowPaidCalls: band !== "stopped",
  }
}

/**
 * Whether a scored opportunity may proceed to paid LLM/X work under current band.
 */
export function governorAllowsOpportunity(
  snap: GovernorSnapshot,
  opts: { opportunityScore: number; priorityAuthor?: boolean },
): { allowed: boolean; reason: string } {
  if (!snap.enabled) return { allowed: true, reason: "governor_disabled" }
  if (!snap.allowPaidCalls) return { allowed: false, reason: "budget_exhausted" }

  const score = opts.opportunityScore
  if (snap.band === "high_or_bump") {
    if (opts.priorityAuthor || score >= snap.minOpportunityScore) {
      return { allowed: true, reason: "high_or_priority" }
    }
    return { allowed: false, reason: "below_band_threshold" }
  }
  if (snap.band === "prefer_priority" && opts.priorityAuthor) {
    return { allowed: true, reason: "priority_author" }
  }
  if (score >= snap.minOpportunityScore) {
    return { allowed: true, reason: "score_ok" }
  }
  return { allowed: false, reason: "below_band_threshold" }
}

export async function recordUsage(input: {
  provider: ArieUsageProvider
  operation: string
  units?: number
  estimatedCostUsd: number
  metadata?: Record<string, unknown>
}): Promise<void> {
  const periodKey = currentBudgetPeriodKey()
  await prisma.arieUsageRecord.create({
    data: {
      provider: input.provider,
      operation: input.operation,
      units: input.units ?? 0,
      estimatedCostUsd: new Prisma.Decimal(input.estimatedCostUsd.toFixed(6)),
      metadata: input.metadata ?? undefined,
      periodKey,
    },
  })
  await arieLog("info", "cost", "usage_recorded", {
    provider: input.provider,
    operation: input.operation,
    estimatedCostUsd: input.estimatedCostUsd,
    periodKey,
  })
}
