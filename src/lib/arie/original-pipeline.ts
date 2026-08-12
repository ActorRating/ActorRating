import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { buildContextPackage } from "@/lib/arie/context-builder"
import { extractEntitiesFromText } from "@/lib/arie/entity-extract"
import { ingestInboundEvent } from "@/lib/arie/ingest"
import { arieLog } from "@/lib/arie/log"
import { generateOriginalConcepts } from "@/lib/arie/original-concepts"
import { runOriginalQa } from "@/lib/arie/original-qa"
import {
  buildOriginalDedupeKey,
  originalExpiresAt,
  scoreOriginalOpportunity,
} from "@/lib/arie/original-score"
import {
  MAX_CONCEPT_GEN,
  MAX_DRAFT_GEN,
  MAX_QA_RUNS,
  type OriginalConcept,
  type OriginalDraft,
  type OriginalQaResult,
  type OriginalScoreResult,
  type OriginalStatus,
  type VisualSpec,
} from "@/lib/arie/original-types"
import { decorateActorRatingLinks, originalAttributionCode } from "@/lib/arie/original-attribution"
import { checkOriginalConstitution } from "@/lib/arie/original-constitution"
import {
  buildOriginalPrediction,
  hashOriginalContent,
  mapConceptFormatToTaxonomy,
} from "@/lib/arie/original-prediction"
import { extractTweetId } from "@/lib/arie/x"
import { isPriorityAuthor } from "@/lib/arie/priority-accounts"
import { generateOriginalDraft } from "@/lib/arie/original-writer"
import { isTransientInferenceFailure } from "@/lib/arie/groq"
import { evaluateScoutExclusion } from "@/lib/arie/scout-exclusions"
import { scoreOpportunity } from "@/lib/arie/opportunity-score"
import type { ContextPackage } from "@/lib/arie/types"
import { CONTEXT_BUILDER_VERSION } from "@/lib/arie/types"

function isPriorityLike(handle: string): boolean {
  return isPriorityAuthor(handle)
}

async function loadPackageForOpportunity(
  opportunityId: string,
): Promise<ContextPackage | null> {
  const row = await prisma.arieContextPackage.findFirst({
    where: { opportunityId },
    orderBy: { createdAt: "desc" },
  })
  if (!row) return null
  return row.package as unknown as ContextPackage
}

function asScore(raw: unknown): OriginalScoreResult | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as OriginalScoreResult
  if (typeof o.score !== "number" || !o.breakdown) return null
  return o
}

/**
 * Ingest an event and create/score an ORIGINAL opportunity (no LLM).
 * Dedupes via dedupeKey. Reply pipeline remains separate.
 */
export async function ingestOriginalOpportunity(input: {
  text: string
  authorHandle?: string | null
  authorId?: string | null
  externalId?: string | null
  payload?: Record<string, unknown>
  heatHint?: number | null
  /** Optional fixture corrections (wiring only — provenance rules unchanged). */
  corrections?: string[]
  corroborations?: Array<{ handle: string; text: string; contradicts?: boolean }>
  sourceUrl?: string | null
  /**
   * When set, appends to dedupeKey so validation batches never collide with
   * production opportunities or each other. Does not change score weights.
   */
  /** Optional validation/corpus tags for Scout hard NO rules. */
  tags?: string[]
  dedupeNamespace?: string | null
}): Promise<
  | {
      ok: true
      opportunityId: string
      originalStatus: string
      originalScore: number
      eligible: boolean
      deduped: boolean
      duplicateOfId?: string
    }
  | { ok: false; reason: string }
> {
  const text = input.text.trim()
  if (!text) return { ok: false, reason: "text_required" }

  const externalId =
    input.externalId?.trim() ||
    `manual-original-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const sourcePostId =
    (typeof input.payload?.sourcePostId === "string" && input.payload.sourcePostId) ||
    extractTweetId(externalId) ||
    (typeof input.payload?.tweetUrl === "string"
      ? extractTweetId(input.payload.tweetUrl)
      : null)
  const sourceUrl =
    (typeof input.payload?.sourceUrl === "string" && input.payload.sourceUrl) ||
    (typeof input.payload?.tweetUrl === "string" && input.payload.tweetUrl) ||
    (sourcePostId ? `https://x.com/i/web/status/${sourcePostId}` : null)
  const sourceHandle = (input.authorHandle ?? "").replace(/^@/, "").toLowerCase() || null
  const sourceType = sourceHandle
    ? isPriorityLike(sourceHandle)
      ? "priority_distribution"
      : "manual_or_other"
    : "manual"

  const ingested = await ingestInboundEvent({
    externalId,
    authorHandle: input.authorHandle,
    authorId: input.authorId,
    text,
    payload: { ...(input.payload ?? {}), arieContentType: "original" },
    // Skip reply pipeline — we build original-specific opportunity below.
    process: false,
  })
  if (!ingested.ok) return { ok: false, reason: ingested.reason }

  const event = ingested.event
  const ageMinutes = Math.max(0, (Date.now() - event.receivedAt.getTime()) / 60_000)
  const entities = await extractEntitiesFromText(prisma, text)

  // Reply score still computed for context package compatibility / dual view
  const replyOpp = scoreOpportunity({
    text,
    authorHandle: input.authorHandle,
    entities,
    ageMinutes,
  })

  const context = await buildContextPackage(prisma, {
    text,
    authorHandle: input.authorHandle,
    authorId: input.authorId,
    externalId: event.externalId,
    sourceUrl: input.sourceUrl ?? sourceUrl,
    ageMinutes,
    entities,
    opportunity: replyOpp,
    corrections: input.corrections,
    corroborations: input.corroborations,
  })

  const originalScore = scoreOriginalOpportunity({
    text,
    authorHandle: input.authorHandle,
    tags: input.tags,
    entities,
    context,
    ageMinutes,
    heatHint: input.heatHint,
  })

  const baseDedupe = buildOriginalDedupeKey({
    eventType: originalScore.eventType,
    entities,
    text,
  })
  const dedupeKey = input.dedupeNamespace
    ? `${input.dedupeNamespace}:${baseDedupe}`
    : baseDedupe

  const existing = input.dedupeNamespace
    ? null
    : await prisma.arieOpportunity.findFirst({
    where: {
      contentType: "original",
      dedupeKey,
      originalStatus: { notIn: ["IGNORED", "REJECTED", "EXPIRED", "DUPLICATE"] },
    },
    orderBy: { createdAt: "desc" },
  })

  if (existing && existing.id) {
    // Mark inbound as processed and create a DUPLICATE stub for audit (optional: skip create)
    await prisma.arieInboundEvent.update({
      where: { id: event.id },
      data: {
        decision: "IGNORE",
        opportunityScore: originalScore.score,
        scoreBreakdown: originalScore.breakdown as unknown as Prisma.InputJsonValue,
        reasonCodes: [...originalScore.reasonCodes, "original_duplicate"],
        processedAt: new Date(),
      },
    })

    const dup = await prisma.arieOpportunity.create({
      data: {
        inboundEventId: event.id,
        contentType: "original",
        format: "original",
        status: "duplicate",
        opportunityScore: replyOpp.score,
        scoreBreakdown: replyOpp.breakdown as unknown as Prisma.InputJsonValue,
        priorityAuthor: replyOpp.priorityAuthor,
        originalScore: originalScore.score,
        originalScoreBreakdown: {
          ...originalScore.breakdown,
          reasonCodes: originalScore.reasonCodes,
          eventType: originalScore.eventType,
          velocity: originalScore.velocity,
          actorRatingAdvantage: originalScore.actorRatingAdvantage,
          eligible: originalScore.eligible,
          duplicateOf: existing.id,
        } as unknown as Prisma.InputJsonValue,
        dedupeKey,
        expiresAt: existing.expiresAt ?? originalExpiresAt(originalScore.eventType),
        originalStatus: "DUPLICATE",
        ignoredReason: `duplicate_of:${existing.id}`,
        sourceHandle,
        sourcePostId,
        sourceType,
        sourceUrl,
        sourceTimestamp: event.receivedAt,
        attributionCode: originalAttributionCode(existing.id),
      },
    })

    await prisma.arieContextPackage.create({
      data: {
        opportunityId: dup.id,
        inboundEventId: event.id,
        package: context as unknown as Prisma.InputJsonValue,
        builderVersion: CONTEXT_BUILDER_VERSION,
      },
    })

    await arieLog("info", "original", "duplicate_detected", {
      opportunityId: dup.id,
      duplicateOf: existing.id,
      dedupeKey,
    })

    return {
      ok: true,
      opportunityId: existing.id,
      originalStatus: existing.originalStatus ?? "SCORED",
      originalScore: existing.originalScore ?? originalScore.score,
      eligible: (existing.originalStatus ?? "") !== "IGNORED",
      deduped: true,
      duplicateOfId: existing.id,
    }
  }

  const originalStatus: OriginalStatus = !originalScore.eligible
    ? "IGNORED"
    : "ELIGIBLE"

  const opp = await prisma.arieOpportunity.create({
    data: {
      inboundEventId: event.id,
      contentType: "original",
      format: "original",
      status: originalStatus === "ELIGIBLE" ? "open" : "ignored",
      opportunityScore: replyOpp.score,
      scoreBreakdown: replyOpp.breakdown as unknown as Prisma.InputJsonValue,
      priorityAuthor: replyOpp.priorityAuthor,
      originalScore: originalScore.score,
      originalScoreBreakdown: {
        ...originalScore.breakdown,
        reasonCodes: originalScore.reasonCodes,
        eventType: originalScore.eventType,
        velocity: originalScore.velocity,
        actorRatingAdvantage: originalScore.actorRatingAdvantage,
        eligible: originalScore.eligible,
      } as unknown as Prisma.InputJsonValue,
      dedupeKey,
      expiresAt: originalExpiresAt(originalScore.eventType),
      originalStatus: originalStatus === "IGNORED" ? "IGNORED" : "ELIGIBLE",
      ignoredReason: originalStatus === "IGNORED" ? originalScore.reasonCodes.join(",") : null,
      sourceHandle,
      sourcePostId,
      sourceType,
      sourceUrl,
      sourceTimestamp: event.receivedAt,
      attributionCode: null, // set to opp.id after create
    },
  })

  await prisma.arieOpportunity.update({
    where: { id: opp.id },
    data: { attributionCode: originalAttributionCode(opp.id) },
  })

  await prisma.arieContextPackage.create({
    data: {
      opportunityId: opp.id,
      inboundEventId: event.id,
      package: context as unknown as Prisma.InputJsonValue,
      builderVersion: CONTEXT_BUILDER_VERSION,
    },
  })

  await prisma.arieInboundEvent.update({
    where: { id: event.id },
    data: {
      decision: originalScore.eligible ? "PROCESS" : "IGNORE",
      opportunityScore: originalScore.score,
      scoreBreakdown: originalScore.breakdown as unknown as Prisma.InputJsonValue,
      reasonCodes: originalScore.reasonCodes,
      processedAt: new Date(),
    },
  })

  await arieLog("info", "original", "opportunity_created", {
    opportunityId: opp.id,
    score: originalScore.score,
    status: opp.originalStatus,
    eligible: originalScore.eligible,
  })

  return {
    ok: true,
    opportunityId: opp.id,
    originalStatus: opp.originalStatus ?? "SCORED",
    originalScore: originalScore.score,
    eligible: originalScore.eligible,
    deduped: false,
  }
}

export async function expireStaleOriginals(now = new Date()): Promise<number> {
  const res = await prisma.arieOpportunity.updateMany({
    where: {
      contentType: "original",
      expiresAt: { lt: now },
      originalStatus: {
        notIn: ["PUBLISHED", "EXPIRED", "REJECTED", "DUPLICATE"],
      },
    },
    data: { originalStatus: "EXPIRED", status: "expired" },
  })
  return res.count
}

export async function generateConceptsForOpportunity(
  opportunityId: string,
  opts?: { bypassGovernor?: boolean },
): Promise<
  | { ok: true; concepts: OriginalConcept[]; selected: OriginalConcept; explanation: string }
  | { ok: false; reason: string }
> {
  const opp = await prisma.arieOpportunity.findUnique({ where: { id: opportunityId } })
  if (!opp || opp.contentType !== "original") return { ok: false, reason: "not_original" }
  if (opp.originalStatus === "EXPIRED") return { ok: false, reason: "expired" }
  if (opp.originalStatus === "PUBLISHED") return { ok: false, reason: "already_published" }
  if (opp.conceptGenCount >= MAX_CONCEPT_GEN) return { ok: false, reason: "concept_gen_cap" }

  if (opp.expiresAt && opp.expiresAt.getTime() < Date.now()) {
    await prisma.arieOpportunity.update({
      where: { id: opp.id },
      data: { originalStatus: "EXPIRED" },
    })
    return { ok: false, reason: "expired" }
  }

  const pkg = await loadPackageForOpportunity(opp.id)
  if (!pkg) return { ok: false, reason: "missing_context" }

  const score =
    asScore(opp.originalScoreBreakdown) ??
    ({
      score: opp.originalScore ?? 0,
      breakdown: { heat: 0, relevance: 0, visual: 0, discussion: 0, data: 0, timing: 0 },
      eligible: (opp.originalScore ?? 0) >= 55,
      reasonCodes: [],
      eventType: "other",
      velocity: "unknown",
      actorRatingAdvantage: "",
    } satisfies OriginalScoreResult)

  // Re-hydrate eligible/advantage from stored breakdown extras if present
  const stored = opp.originalScoreBreakdown as Record<string, unknown> | null
  if (stored) {
    if (typeof stored.eligible === "boolean") score.eligible = stored.eligible
    if (typeof stored.actorRatingAdvantage === "string") {
      score.actorRatingAdvantage = stored.actorRatingAdvantage
    }
    if (typeof stored.eventType === "string") {
      score.eventType = stored.eventType as OriginalScoreResult["eventType"]
    }
    if (typeof stored.velocity === "string") {
      score.velocity = stored.velocity as OriginalScoreResult["velocity"]
    }
  }

  if (opp.originalStatus === "IGNORED" || !score.eligible) {
    return { ok: false, reason: "not_eligible" }
  }

  const scout = evaluateScoutExclusion({
    text: pkg.event.text,
    authorHandle: pkg.event.author_handle,
    offBrand: score.reasonCodes.some((c) => c.startsWith("scout_") || c === "off_brand_topic"),
    dataScore: score.breakdown.data,
  })
  if (scout.excluded) {
    await prisma.arieOpportunity.update({
      where: { id: opp.id },
      data: {
        originalStatus: "IGNORED",
        status: "ignored",
        ignoredReason: scout.code ?? "scout_excluded",
      },
    })
    return { ok: false, reason: scout.code ?? "scout_excluded" }
  }

  const gen = await generateOriginalConcepts({
    package: pkg,
    originalScore: score,
    bypassGovernor: opts?.bypassGovernor ?? true,
  })
  if (!gen.ok) {
    const transient = isTransientInferenceFailure(gen.reason)
    await prisma.arieOpportunity.update({
      where: { id: opp.id },
      data: {
        conceptGenCount: { increment: 1 },
        ...(transient
          ? {}
          : { originalStatus: "FAILED" }),
        modelMeta: {
          lastError: gen.reason,
          stage: "concepts",
          transient,
        } as Prisma.InputJsonValue,
      },
    })
    return { ok: false, reason: gen.reason }
  }

  const promptVersions = {
    ...((opp.promptVersions as object) ?? {}),
    concept: gen.promptVersion,
  }

  await prisma.arieOpportunity.update({
    where: { id: opp.id },
    data: {
      concepts: gen.concepts as unknown as Prisma.InputJsonValue,
      selectedConceptId: gen.selected.id,
      selectedConcept: gen.selected as unknown as Prisma.InputJsonValue,
      conceptRankMeta: { explanation: gen.rankExplanation } as Prisma.InputJsonValue,
      contentFormat: mapConceptFormatToTaxonomy(gen.selected.format),
      originalStatus: "CONCEPTS_GENERATED",
      conceptGenCount: { increment: 1 },
      promptVersions: promptVersions as Prisma.InputJsonValue,
      modelMeta: {
        conceptModel: gen.model,
        conceptMs: gen.generationMs,
        conceptUsage: gen.usage,
      } as Prisma.InputJsonValue,
    },
  })

  await arieLog("info", "original", "concepts_generated", {
    opportunityId: opp.id,
    count: gen.concepts.length,
    selected: gen.selected.id,
  })

  return {
    ok: true,
    concepts: gen.concepts,
    selected: gen.selected,
    explanation: gen.rankExplanation,
  }
}

export async function selectConceptForOpportunity(
  opportunityId: string,
  conceptId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const opp = await prisma.arieOpportunity.findUnique({ where: { id: opportunityId } })
  if (!opp || opp.contentType !== "original") return { ok: false, reason: "not_original" }
  const concepts = (opp.concepts as unknown as OriginalConcept[]) ?? []
  const selected = concepts.find((c) => c.id === conceptId)
  if (!selected) return { ok: false, reason: "concept_not_found" }

  await prisma.arieOpportunity.update({
    where: { id: opp.id },
    data: {
      selectedConceptId: selected.id,
      selectedConcept: selected as unknown as Prisma.InputJsonValue,
      contentFormat: mapConceptFormatToTaxonomy(selected.format),
      originalStatus: "CONCEPT_SELECTED",
    },
  })
  await arieLog("info", "original", "concept_selected", {
    opportunityId: opp.id,
    conceptId: selected.id,
  })
  return { ok: true }
}

export async function generateDraftForOpportunity(
  opportunityId: string,
  opts?: { bypassGovernor?: boolean; conceptId?: string },
): Promise<
  | { ok: true; draft: OriginalDraft; visual: VisualSpec }
  | { ok: false; reason: string }
> {
  const opp = await prisma.arieOpportunity.findUnique({ where: { id: opportunityId } })
  if (!opp || opp.contentType !== "original") return { ok: false, reason: "not_original" }
  if (opp.draftGenCount >= MAX_DRAFT_GEN) return { ok: false, reason: "draft_gen_cap" }
  if (opp.originalStatus === "EXPIRED") return { ok: false, reason: "expired" }

  const pkg = await loadPackageForOpportunity(opp.id)
  if (!pkg) return { ok: false, reason: "missing_context" }

  let concept = opp.selectedConcept as unknown as OriginalConcept | null
  if (opts?.conceptId) {
    const concepts = (opp.concepts as unknown as OriginalConcept[]) ?? []
    concept = concepts.find((c) => c.id === opts.conceptId) ?? null
  }
  if (!concept) return { ok: false, reason: "no_selected_concept" }

  const score = reconstructScore(opp)
  const gen = await generateOriginalDraft({
    package: pkg,
    concept,
    originalScore: score,
    bypassGovernor: opts?.bypassGovernor ?? true,
  })
  if (!gen.ok) {
    const transient = isTransientInferenceFailure(gen.reason)
    await prisma.arieOpportunity.update({
      where: { id: opp.id },
      data: {
        draftGenCount: { increment: 1 },
        modelMeta: {
          ...((opp.modelMeta as object) ?? {}),
          lastError: gen.reason,
          stage: "draft",
          transient,
        } as Prisma.InputJsonValue,
      },
    })
    return { ok: false, reason: gen.reason }
  }

  const draft: OriginalDraft = {
    ...gen.draft,
    links: decorateActorRatingLinks(gen.draft.links, opp.id),
  }

  await prisma.arieOpportunity.update({
    where: { id: opp.id },
    data: {
      selectedConceptId: concept.id,
      selectedConcept: concept as unknown as Prisma.InputJsonValue,
      contentFormat: mapConceptFormatToTaxonomy(concept.format),
      finalDraft: draft.text,
      draftJson: draft as unknown as Prisma.InputJsonValue,
      visualSpec: gen.visual as unknown as Prisma.InputJsonValue,
      originalStatus: "DRAFT_GENERATED",
      draftGenCount: { increment: 1 },
      attributionCode: opp.attributionCode ?? originalAttributionCode(opp.id),
      promptVersions: {
        ...((opp.promptVersions as object) ?? {}),
        writer: gen.promptVersion,
      } as Prisma.InputJsonValue,
      modelMeta: {
        ...((opp.modelMeta as object) ?? {}),
        writerModel: gen.model,
        writerMs: gen.generationMs,
        writerUsage: gen.usage,
      } as Prisma.InputJsonValue,
      publishStatus: "DRAFT",
      publishError: null,
    },
  })

  await arieLog("info", "original", "draft_generated", { opportunityId: opp.id })

  return { ok: true, draft, visual: gen.visual }
}

export async function runQaForOpportunity(
  opportunityId: string,
  opts?: { bypassGovernor?: boolean },
): Promise<
  | { ok: true; qa: OriginalQaResult }
  | { ok: false; reason: string; qa?: OriginalQaResult }
> {
  const opp = await prisma.arieOpportunity.findUnique({ where: { id: opportunityId } })
  if (!opp || opp.contentType !== "original") return { ok: false, reason: "not_original" }
  if (opp.qaRunCount >= MAX_QA_RUNS) return { ok: false, reason: "qa_cap" }

  const pkg = await loadPackageForOpportunity(opp.id)
  if (!pkg) return { ok: false, reason: "missing_context" }

  const concept = opp.selectedConcept as unknown as OriginalConcept | null
  const draftJson = opp.draftJson as unknown as OriginalDraft | null
  if (!concept || !draftJson?.text) return { ok: false, reason: "missing_draft_or_concept" }

  // Prefer edited finalDraft
  const draft: OriginalDraft = {
    ...draftJson,
    text: opp.finalDraft?.trim() || draftJson.text,
  }

  const qaRes = await runOriginalQa({
    draft,
    concept,
    package: pkg,
    originalScore: opp.originalScore ?? 0,
    expiresAt: opp.expiresAt,
    dedupeDuplicate: opp.originalStatus === "DUPLICATE",
    bypassGovernor: opts?.bypassGovernor ?? true,
  })

  if (!qaRes.ok && !qaRes.qa) {
    await prisma.arieOpportunity.update({
      where: { id: opp.id },
      data: { qaRunCount: { increment: 1 } },
    })
    return { ok: false, reason: qaRes.reason }
  }

  const qa = qaRes.qa!
  await prisma.arieOpportunity.update({
    where: { id: opp.id },
    data: {
      qaResult: qa as unknown as Prisma.InputJsonValue,
      originalStatus: qa.passed ? "READY" : "QA_FAILED",
      qaRunCount: { increment: 1 },
      promptVersions: {
        ...((opp.promptVersions as object) ?? {}),
        qa: "original-qa@v1.0",
      } as Prisma.InputJsonValue,
      ...(qaRes.ok && "model" in qaRes && qaRes.model
        ? {
            modelMeta: {
              ...((opp.modelMeta as object) ?? {}),
              qaModel: qaRes.model,
            } as Prisma.InputJsonValue,
          }
        : {}),
    },
  })

  await arieLog("info", "original", qa.passed ? "qa_passed" : "qa_failed", {
    opportunityId: opp.id,
    passed: qa.passed,
  })

  return qaRes.ok ? { ok: true, qa } : { ok: false, reason: qaRes.reason, qa }
}

export async function approveOriginalOpportunity(input: {
  opportunityId: string
  email: string
  editedDraft?: string | null
}): Promise<{ ok: true; predictionScore?: number } | { ok: false; reason: string }> {
  const opp = await prisma.arieOpportunity.findUnique({
    where: { id: input.opportunityId },
    include: { contextPackage: true },
  })
  if (!opp || opp.contentType !== "original") return { ok: false, reason: "not_original" }
  if (opp.originalStatus === "EXPIRED") return { ok: false, reason: "expired" }
  if (opp.originalStatus === "PUBLISHED" || opp.originalStatus === "PUBLISHING") {
    return { ok: false, reason: "already_published_or_publishing" }
  }
  if (opp.expiresAt && opp.expiresAt.getTime() < Date.now()) {
    await prisma.arieOpportunity.update({
      where: { id: opp.id },
      data: { originalStatus: "EXPIRED" },
    })
    return { ok: false, reason: "expired" }
  }

  const text = (input.editedDraft?.trim() || opp.finalDraft || "").trim()
  if (!text) return { ok: false, reason: "missing_draft" }
  if (text.length > 280) return { ok: false, reason: "over_280" }

  if (!["READY", "APPROVED", "QA_PASSED"].includes(opp.originalStatus ?? "")) {
    return { ok: false, reason: "qa_not_passed" }
  }

  const qa = opp.qaResult as { passed?: boolean } | null
  if (qa && qa.passed === false) return { ok: false, reason: "qa_failed" }

  const constitution = checkOriginalConstitution(text)
  if (!constitution.passed) {
    await arieLog("warn", "original", "constitution_failed", {
      opportunityId: opp.id,
      errors: constitution.errors,
    })
    return { ok: false, reason: `constitution:${constitution.errors.join(",")}` }
  }

  const contentHash = hashOriginalContent(text)
  const dupText = await prisma.arieOpportunity.findFirst({
    where: {
      contentType: "original",
      contentHash,
      id: { not: opp.id },
      originalStatus: { in: ["APPROVED", "PUBLISHING", "PUBLISHED"] },
    },
  })
  if (dupText) return { ok: false, reason: "duplicate_content_hash" }

  const score = reconstructScore(opp)
  const concept = opp.selectedConcept as OriginalConcept | null
  const pkg = opp.contextPackage?.package as ContextPackage | null
  const contentFormat =
    opp.contentFormat || mapConceptFormatToTaxonomy(concept?.format ?? "DISCUSSION_DEBATE")

  // Freeze prediction at approve if not already locked (never overwrite after publish lock)
  const prompts = (opp.promptVersions as Record<string, string> | null) ?? {}
  let prediction = opp.prediction as ReturnType<typeof buildOriginalPrediction> | null
  if (!opp.predictionLockedAt || !prediction) {
    prediction = buildOriginalPrediction({
      originalScore: score,
      concept,
      contentFormat,
      priorityAuthor: opp.priorityAuthor,
      coveragePercent: pkg?.coverage?.percent,
      measurement: {
        factualConfidence: pkg?.factualConfidence ?? null,
        sourceDistributionPriority: pkg?.sourceProvenance?.distributionPriority ?? null,
        sourceReliabilityClass: pkg?.sourceProvenance?.reliabilityClass ?? null,
        writerVersion: prompts.writer ?? prompts["original-writer"] ?? null,
        qaOutcome: opp.qaResult
          ? (opp.qaResult as { passed?: boolean }).passed
            ? "passed"
            : "failed"
          : null,
        humanApprovalOutcome: "approved",
        publishedOutcome: "not_published",
      },
    })
  }

  const lineage = {
    inboundEventId: opp.inboundEventId,
    opportunityId: opp.id,
    contextPackageId: opp.contextPackage?.id ?? null,
    builderVersion: opp.contextPackage?.builderVersion ?? null,
    originalScore: opp.originalScore,
    selectedConceptId: opp.selectedConceptId,
    contentFormat,
    promptVersions: prompts,
    predictionVersion: prediction.predictionModelVersion,
    attributionCode: opp.attributionCode ?? originalAttributionCode(opp.id),
    approvedByEmail: input.email,
    approvedAt: new Date().toISOString(),
  }

  await prisma.arieOpportunity.update({
    where: { id: opp.id },
    data: {
      finalDraft: text,
      contentHash,
      contentFormat,
      originalStatus: "APPROVED",
      approvedAt: new Date(),
      approvedByEmail: input.email,
      publishError: null,
      attributionCode: opp.attributionCode ?? originalAttributionCode(opp.id),
      prediction: prediction as unknown as Prisma.InputJsonValue,
      predictionVersion: prediction.predictionModelVersion,
      predictedScore: prediction.predictedScore,
      predictedTier: prediction.predictedTier,
      // Lock only at publish time permanently — approve can refresh while not published
      predictionLockedAt: opp.predictionLockedAt,
      lineage: lineage as unknown as Prisma.InputJsonValue,
    },
  })

  await arieLog("info", "original", "approved", {
    opportunityId: opp.id,
    predictedScore: prediction.predictedScore,
  })

  return { ok: true, predictionScore: prediction.predictedScore }
}

export async function setOriginalStatus(
  opportunityId: string,
  status: OriginalStatus,
  reason?: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const opp = await prisma.arieOpportunity.findUnique({ where: { id: opportunityId } })
  if (!opp || opp.contentType !== "original") return { ok: false, reason: "not_original" }
  await prisma.arieOpportunity.update({
    where: { id: opp.id },
    data: {
      originalStatus: status,
      ignoredReason: reason ?? opp.ignoredReason,
      status:
        status === "IGNORED" || status === "REJECTED"
          ? "ignored"
          : status === "EXPIRED"
            ? "expired"
            : opp.status,
    },
  })
  return { ok: true }
}

function reconstructScore(opp: {
  originalScore: number | null
  originalScoreBreakdown: unknown
}): OriginalScoreResult {
  const stored = opp.originalScoreBreakdown as Record<string, unknown> | null
  const breakdown = (stored ?? {}) as OriginalScoreResult["breakdown"]
  return {
    score: opp.originalScore ?? 0,
    breakdown: {
      heat: Number(breakdown.heat ?? 0),
      relevance: Number(breakdown.relevance ?? 0),
      visual: Number(breakdown.visual ?? 0),
      discussion: Number(breakdown.discussion ?? 0),
      data: Number(breakdown.data ?? 0),
      timing: Number(breakdown.timing ?? 0),
    },
    eligible: Boolean(stored?.eligible ?? (opp.originalScore ?? 0) >= 55),
    reasonCodes: Array.isArray(stored?.reasonCodes)
      ? (stored!.reasonCodes as string[])
      : [],
    eventType: (stored?.eventType as OriginalScoreResult["eventType"]) ?? "other",
    velocity: (stored?.velocity as OriginalScoreResult["velocity"]) ?? "unknown",
    actorRatingAdvantage: String(stored?.actorRatingAdvantage ?? ""),
  }
}
