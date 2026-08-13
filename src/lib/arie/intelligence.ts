/**
 * Daily Intelligence v0 — rank today's original opportunities for human review.
 */

import { prisma } from "@/lib/prisma"
import type { OriginalConcept } from "@/lib/arie/original-types"
import type { ContextPackage } from "@/lib/arie/types"
import { loadDiscoveryStatsForIntelligence } from "@/lib/arie/discovery/admin"
import { isPriorityAuthor } from "@/lib/arie/priority-accounts"
import { isTrustedOriginalSource } from "@/lib/arie/provenance"

export type IntelligenceTier = "exceptional" | "strong" | "worth_attention" | "other"

export type IntelligenceCandidate = {
  id: string
  tier: IntelligenceTier
  intelligenceScore: number
  originalScore: number | null
  originalStatus: string | null
  distributionPriority: string | null
  sourceReliability: string | null
  factualConfidence: number | null
  writerMode: string | null
  actorRatingAdvantage: string | null
  whyNow: string | null
  sourceHandle: string | null
  sourceText: string | null
  concepts: OriginalConcept[] | null
  selectedConcept: OriginalConcept | null
  draftText: string | null
  qaPassed: boolean | null
  qaSummary: string | null
  actorRatingPayload: {
    present: boolean
    payloadType: string | null
    summary: string | null
  } | null
  evidenceSummary: {
    confirmed: number
    reported: number
    uncertain: number
    contradicted: number
    missingEvidence: string[]
  } | null
  visualEligible: boolean | null
  visualReason: string | null
  publishStatus: string
  expiresAt: string | null
  createdAt: string
}

export type DailyIntelligenceSummary = {
  date: string
  totalOpportunities: number
  worthAttention: number
  exceptional: number
  withDraft: number
  qaReady: number
  /** Posts discovered today (Discovery Engine). */
  scanned?: number
  candidates: IntelligenceCandidate[]
}

const ACTIVE_STATUSES = [
  "ELIGIBLE",
  "CONCEPTS_GENERATED",
  "CONCEPT_SELECTED",
  "DRAFT_GENERATED",
  "QA_PASSED",
  "QA_FAILED",
  "READY",
  "APPROVED",
  "SCORED",
  "NEW",
] as const

export function computeIntelligenceScore(input: {
  originalScore: number | null
  distributionRank?: number
  distributionPriority?: string | null
  factualConfidence?: number | null
  hasDraft?: boolean
  qaPassed?: boolean | null
  payloadPresent?: boolean
  writerMode?: string | null
}): number {
  let score = input.originalScore ?? 0
  if (input.distributionPriority === "HIGH") score += 8
  else if (input.distributionPriority === "MEDIUM") score += 4
  if (input.hasDraft) score += 6
  if (input.qaPassed) score += 10
  if (input.payloadPresent) score += 5
  if (input.writerMode === "REPORTED_EVENT") score += 2
  if (typeof input.factualConfidence === "number" && input.factualConfidence >= 75) score += 3
  return Math.min(100, Math.round(score))
}

export function tierFromScore(score: number): IntelligenceTier {
  if (score >= 90) return "exceptional"
  if (score >= 78) return "strong"
  if (score >= 65) return "worth_attention"
  return "other"
}

/**
 * Strong / worth-attention requires trusted source, priority author, or AR payload.
 * UNKNOWN/non-priority without payload stay `other` even if raw score is high.
 */
export function intelligenceQualifiesForAttention(input: {
  sourceReliability?: string | null
  sourceHandle?: string | null
  payloadPresent?: boolean
}): boolean {
  if (input.payloadPresent) return true
  if (isPriorityAuthor(input.sourceHandle)) return true
  if (isTrustedOriginalSource(input.sourceHandle)) return true
  const rel = (input.sourceReliability ?? "").toUpperCase()
  return (
    rel === "PRIMARY" ||
    rel === "TRADE" ||
    rel === "AGGREGATOR" ||
    rel === "SPECIALIST" ||
    rel === "ESTABLISHED_ENTERTAINMENT_MEDIA"
  )
}

export function applyIntelligenceQualityGate(input: {
  intelligenceScore: number
  sourceReliability?: string | null
  sourceHandle?: string | null
  payloadPresent?: boolean
}): { intelligenceScore: number; tier: IntelligenceTier } {
  if (intelligenceQualifiesForAttention(input)) {
    return {
      intelligenceScore: input.intelligenceScore,
      tier: tierFromScore(input.intelligenceScore),
    }
  }
  return {
    intelligenceScore: Math.min(input.intelligenceScore, 64),
    tier: "other",
  }
}

export function selectIntelligenceAttentionCandidates(
  candidates: IntelligenceCandidate[],
  limit: number,
): IntelligenceCandidate[] {
  const attention = candidates.filter((c) => c.tier !== "other")
  const pool = attention.length > 0 ? attention : candidates
  return pool.slice(0, limit)
}

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export async function loadDailyIntelligence(opts?: {
  day?: Date
  limit?: number
}): Promise<DailyIntelligenceSummary> {
  const day = opts?.day ?? new Date()
  const from = startOfUtcDay(day)
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000)
  const limit = opts?.limit ?? 5

  const discoveryStats = await loadDiscoveryStatsForIntelligence(day)

  const rows = await prisma.arieOpportunity.findMany({
    where: {
      contentType: "original",
      createdAt: { gte: from, lt: to },
      originalStatus: { in: [...ACTIVE_STATUSES] },
    },
    include: {
      inboundEvent: {
        select: { text: true, authorHandle: true },
      },
      contextPackage: {
        select: { package: true },
      },
    },
    orderBy: [{ originalScore: "desc" }, { createdAt: "desc" }],
    take: 200,
  })

  const candidates: IntelligenceCandidate[] = rows.map((row) => {
    const breakdown = row.originalScoreBreakdown as Record<string, unknown> | null
    const pkg = row.contextPackage?.package as ContextPackage | undefined
    const evidence = pkg?.evidence
    const src = pkg?.sourceProvenance
    const concepts = (row.concepts as OriginalConcept[] | null) ?? null
    const selected = (row.selectedConcept as OriginalConcept | null) ?? null
    const qa = row.qaResult as { passed?: boolean; semantic?: { summary?: string } } | null
    const draftText = row.finalDraft?.trim() || null
    const payload = selected
      ? {
          present: Boolean(selected.actorRatingPayloadPresent),
          payloadType: selected.payloadType ?? null,
          summary: selected.payloadSummary ?? selected.actorRatingAdvantage ?? null,
        }
      : null

    const rawScore = computeIntelligenceScore({
      originalScore: row.originalScore,
      distributionPriority: src?.distributionPriority ?? null,
      distributionRank: src?.distributionRank,
      factualConfidence: pkg?.factualConfidence ?? evidence?.factualConfidence ?? null,
      hasDraft: Boolean(draftText),
      qaPassed: qa?.passed ?? null,
      payloadPresent: payload?.present,
      writerMode: pkg?.writerMode ?? evidence?.writerMode ?? null,
    })
    const gated = applyIntelligenceQualityGate({
      intelligenceScore: rawScore,
      sourceReliability: src?.reliabilityClass ?? null,
      sourceHandle: row.sourceHandle,
      payloadPresent: payload?.present,
    })

    return {
      id: row.id,
      tier: gated.tier,
      intelligenceScore: gated.intelligenceScore,
      originalScore: row.originalScore,
      originalStatus: row.originalStatus,
      distributionPriority: src?.distributionPriority ?? null,
      sourceReliability: src?.reliabilityClass ?? null,
      factualConfidence: pkg?.factualConfidence ?? evidence?.factualConfidence ?? null,
      writerMode: pkg?.writerMode ?? evidence?.writerMode ?? null,
      actorRatingAdvantage:
        (typeof breakdown?.actorRatingAdvantage === "string"
          ? breakdown.actorRatingAdvantage
          : null) ??
        selected?.actorRatingAdvantage ??
        null,
      whyNow:
        typeof breakdown?.eventType === "string"
          ? `${breakdown.eventType} · score ${row.originalScore ?? "?"}`
          : null,
      sourceHandle: row.sourceHandle,
      sourceText: row.inboundEvent?.text ?? null,
      concepts,
      selectedConcept: selected,
      draftText,
      qaPassed: qa?.passed ?? null,
      qaSummary: qa?.semantic?.summary ?? null,
      actorRatingPayload: payload,
      evidenceSummary: evidence
        ? {
            confirmed: evidence.confirmed.length,
            reported: evidence.reported.length,
            uncertain: evidence.uncertain.length,
            contradicted: evidence.contradicted.length,
            missingEvidence: evidence.missingEvidence,
          }
        : null,
      visualEligible:
        row.visualSpec && typeof row.visualSpec === "object"
          ? Boolean((row.visualSpec as { eligible?: boolean }).eligible)
          : null,
      visualReason:
        row.visualSpec && typeof row.visualSpec === "object"
          ? ((row.visualSpec as { reason?: string }).reason ?? null)
          : null,
      publishStatus: row.publishStatus,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }
  })

  candidates.sort((a, b) => b.intelligenceScore - a.intelligenceScore)
  const top = selectIntelligenceAttentionCandidates(candidates, limit)

  return {
    date: from.toISOString().slice(0, 10),
    totalOpportunities: rows.length,
    scanned: discoveryStats.scanned,
    worthAttention: candidates.filter((c) => c.tier !== "other").length,
    exceptional: candidates.filter((c) => c.tier === "exceptional").length,
    withDraft: candidates.filter((c) => c.draftText).length,
    qaReady: candidates.filter((c) => c.qaPassed === true).length,
    candidates: top,
  }
}

export async function skipIntelligenceCandidate(
  opportunityId: string,
  reason?: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const opp = await prisma.arieOpportunity.findUnique({ where: { id: opportunityId } })
  if (!opp || opp.contentType !== "original") return { ok: false, reason: "not_found" }
  await prisma.arieOpportunity.update({
    where: { id: opportunityId },
    data: {
      originalStatus: "IGNORED",
      status: "ignored",
      ignoredReason: reason?.trim() || "intelligence_skip",
    },
  })
  return { ok: true }
}

export type IntelligenceApproveInput = {
  opportunityId: string
  approvedByEmail?: string | null
}

/** Delegates to existing approve flow — does not publish. */
export async function markIntelligenceApproved(
  input: IntelligenceApproveInput,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { approveOriginalOpportunity } = await import("@/lib/arie/original-pipeline")
  const res = await approveOriginalOpportunity({
    opportunityId: input.opportunityId,
    email: input.approvedByEmail ?? "admin",
  })
  return res.ok ? { ok: true } : { ok: false, reason: res.reason }
}
