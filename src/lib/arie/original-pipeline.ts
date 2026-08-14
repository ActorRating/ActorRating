import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { buildContextPackage } from "@/lib/arie/context-builder"
import {
  extractEntitiesFromText,
  isAcceptableMovieTitleMention,
  type ExtractedEntities,
} from "@/lib/arie/entity-extract"
import { ingestInboundEvent } from "@/lib/arie/ingest"
import { arieLog } from "@/lib/arie/log"
import { generateOriginalConcepts } from "@/lib/arie/original-concepts"
import { runOriginalQa } from "@/lib/arie/original-qa"
import {
  buildOriginalDedupeKey,
  incomingOutranksExistingCluster,
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

/** Statuses that may generate/regenerate concepts. Status is source of truth. */
export const CONCEPT_GENERATION_ACTIVE_STATUSES = [
  "ELIGIBLE",
  "CONCEPTS_GENERATED",
  "CONCEPT_SELECTED",
  "DRAFT_GENERATED",
  "QA_PASSED",
  "QA_FAILED",
  "READY",
  "APPROVED",
] as const

export function isConceptGenerationActiveStatus(status: string | null | undefined): boolean {
  return Boolean(status && (CONCEPT_GENERATION_ACTIVE_STATUSES as readonly string[]).includes(status))
}

/**
 * Concept-generation eligibility: pipeline status is source of truth for
 * ELIGIBLE+. IGNORED / REJECTED / DUPLICATE stay blocked. NEW/SCORED/null
 * fall back to reconstructed score.eligible (flat breakdown-aware).
 */
export function evaluateConceptGenerationEligibility(input: {
  originalStatus: string | null | undefined
  score: OriginalScoreResult
}): { ok: true } | { ok: false; reason: string } {
  const status = input.originalStatus ?? null
  if (status === "EXPIRED") return { ok: false, reason: "expired" }
  if (status === "PUBLISHED" || status === "PUBLISHING") {
    return { ok: false, reason: "already_published" }
  }
  if (status === "IGNORED" || status === "REJECTED" || status === "DUPLICATE" || status === "FAILED") {
    return { ok: false, reason: "not_eligible" }
  }
  if (isConceptGenerationActiveStatus(status)) return { ok: true }
  if (!input.score.eligible) return { ok: false, reason: "not_eligible" }
  return { ok: true }
}

/**
 * Block concept generation when the context movie is not a source-supported
 * work mention (generic "Focus Country" / "film festival" poison).
 * Actor/director-only opportunities remain allowed.
 */
export function evaluateSourceSubjectMatch(input: {
  text: string
  package: Pick<ContextPackage, "movie" | "actor" | "director" | "actors">
}): { ok: true } | { ok: false; reason: "source_subject_mismatch" | "no_source_subject" } {
  const movieTitle = input.package.movie?.title?.trim()
  if (movieTitle && !isAcceptableMovieTitleMention(input.text, movieTitle)) {
    return { ok: false, reason: "source_subject_mismatch" }
  }
  const hasMovie = Boolean(movieTitle) && isAcceptableMovieTitleMention(input.text, movieTitle!)
  const hasActor = Boolean(input.package.actor) || (input.package.actors?.length ?? 0) > 0
  const hasDirector = Boolean(input.package.director)
  if (!hasMovie && !hasActor && !hasDirector) {
    return { ok: false, reason: "no_source_subject" }
  }
  return { ok: true }
}

export function entitiesFromContextPackage(pkg: ContextPackage): ExtractedEntities {
  const actors: ExtractedEntities["actors"] = []
  const seen = new Set<string>()
  const pushActor = (id: string, name: string, slug: string | null) => {
    if (seen.has(id)) return
    seen.add(id)
    actors.push({ id, name, slug, confidence: 90 })
  }
  if (pkg.actor) pushActor(pkg.actor.id, pkg.actor.name, pkg.actor.slug)
  for (const a of pkg.actors ?? []) pushActor(a.id, a.name, a.slug)
  return {
    actors,
    movies: pkg.movie
      ? [
          {
            id: pkg.movie.id,
            title: pkg.movie.title,
            year: pkg.movie.year,
            slug: pkg.movie.slug,
            director: pkg.movie.director,
            genre: pkg.movie.genre,
            indexingCohort: pkg.movie.indexingCohort,
            confidence: 90,
          },
        ]
      : [],
    directors: pkg.director ? [{ name: pkg.director.name, confidence: 90 }] : [],
    unresolved: pkg.unresolved ?? [],
  }
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
  /** Source post publication time (X created_at) — used for timing score. */
  sourceCreatedAt?: Date | null
  discoveryMethod?: string | null
  discoveryRunId?: string | null
  discoveryCandidateId?: string | null
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
      inboundDeduped?: boolean
      opportunityCreated?: boolean
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
    sourceCreatedAt: input.sourceCreatedAt ?? null,
    discoveryMethod: input.discoveryMethod ?? null,
    discoveryRunId: input.discoveryRunId ?? null,
    discoveryCandidateId: input.discoveryCandidateId ?? null,
    // Skip reply pipeline — we build original-specific opportunity below.
    process: false,
  })
  if (!ingested.ok) return { ok: false, reason: ingested.reason }

  const event = ingested.event

  // Idempotent: one inbound event → at most one production original opportunity.
  // Validation batches use dedupeNamespace and intentionally create isolated rows.
  if (ingested.deduped && !input.dedupeNamespace) {
    const existingOpp = await prisma.arieOpportunity.findFirst({
      where: {
        inboundEventId: event.id,
        contentType: "original",
        originalStatus: { notIn: ["DUPLICATE"] },
      },
      orderBy: { createdAt: "asc" },
    })
    if (existingOpp) {
      // Refresh discovery lineage on inbound without changing creation provenance.
      await prisma.arieInboundEvent.update({
        where: { id: event.id },
        data: {
          ...(input.discoveryMethod
            ? { discoveryMethod: event.discoveryMethod ?? input.discoveryMethod }
            : {}),
          ...(input.discoveryRunId ? { discoveryRunId: input.discoveryRunId } : {}),
          ...(input.discoveryCandidateId
            ? { discoveryCandidateId: input.discoveryCandidateId }
            : {}),
          ...(input.sourceCreatedAt && !event.sourceCreatedAt
            ? { sourceCreatedAt: input.sourceCreatedAt }
            : {}),
        },
      })
      await arieLog("info", "original", "inbound_opportunity_deduped", {
        opportunityId: existingOpp.id,
        inboundEventId: event.id,
        externalId,
      })
      return {
        ok: true,
        opportunityId: existingOpp.id,
        originalStatus: existingOpp.originalStatus ?? "SCORED",
        originalScore: existingOpp.originalScore ?? 0,
        eligible: (existingOpp.originalStatus ?? "") !== "IGNORED",
        deduped: true,
        duplicateOfId: existingOpp.id,
        inboundDeduped: true,
        opportunityCreated: false,
      }
    }
    // Inbound exists but no opportunity yet (crash recovery) — fall through to create one.
  }

  const referenceTime = input.sourceCreatedAt ?? event.sourceCreatedAt ?? event.receivedAt
  const ageMinutes = Math.max(0, (Date.now() - referenceTime.getTime()) / 60_000)
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

  const incomingWinsCluster =
    existing &&
    existing.id &&
    incomingOutranksExistingCluster({
      incomingEligible: originalScore.eligible,
      incomingHandle: sourceHandle,
      incomingScore: originalScore.score,
      existingHandle: existing.sourceHandle,
      existingScore: existing.originalScore,
      existingStatus: existing.originalStatus,
    })

  if (existing && existing.id && !incomingWinsCluster) {
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
        sourceTimestamp: referenceTime,
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
      opportunityCreated: false,
      inboundDeduped: ingested.deduped,
    }
  }

  const replaceClusterId = incomingWinsCluster && existing?.id ? existing.id : null

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
      sourceTimestamp: referenceTime,
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

  if (replaceClusterId) {
    await prisma.arieOpportunity.update({
      where: { id: replaceClusterId },
      data: {
        originalStatus: "DUPLICATE",
        status: "duplicate",
        ignoredReason: `duplicate_of:${opp.id}`,
      },
    })
    await arieLog("info", "original", "cluster_winner_replaced", {
      opportunityId: opp.id,
      replacedId: replaceClusterId,
      dedupeKey,
    })
  }

  return {
    ok: true,
    opportunityId: opp.id,
    originalStatus: opp.originalStatus ?? "SCORED",
    originalScore: originalScore.score,
    eligible: originalScore.eligible,
    deduped: Boolean(replaceClusterId),
    duplicateOfId: replaceClusterId ?? undefined,
    opportunityCreated: true,
    inboundDeduped: ingested.deduped,
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

  const score = reconstructScore(opp)
  const gate = evaluateConceptGenerationEligibility({
    originalStatus: opp.originalStatus,
    score,
  })
  if (!gate.ok) return { ok: false, reason: gate.reason }
  // Active pipeline status is source of truth — don't let a flat/mis-parsed
  // eligible flag fail generateOriginalConcepts.
  if (isConceptGenerationActiveStatus(opp.originalStatus)) score.eligible = true

  const scout = evaluateScoutExclusion({
    text: pkg.event.text,
    authorHandle: pkg.event.author_handle ?? opp.sourceHandle,
    entities: entitiesFromContextPackage(pkg),
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

  const subject = evaluateSourceSubjectMatch({ text: pkg.event.text, package: pkg })
  if (!subject.ok) {
    return { ok: false, reason: subject.reason }
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

export function reconstructScore(opp: {
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
