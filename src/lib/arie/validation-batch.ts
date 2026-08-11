/**
 * ARIE originals validation batches — immutable corpus runs for scientific evaluation.
 *
 * Does NOT change provenance rules, opportunity scoring weights, or publishing.
 * Does NOT auto-publish. Reuses ingestOriginalOpportunity + optional stage runners.
 */

import { createHash, randomUUID } from "crypto"
import { readFile } from "fs/promises"
import path from "path"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { ARIE_CONSTITUTION_VERSION } from "@/lib/arie/config"
import {
  generateConceptsForOpportunity,
  generateDraftForOpportunity,
  ingestOriginalOpportunity,
  runQaForOpportunity,
} from "@/lib/arie/original-pipeline"
import {
  ORIGINAL_CONCEPT_PROMPT_VERSION,
  ORIGINAL_QA_PROMPT_VERSION,
  ORIGINAL_WRITER_PROMPT_VERSION,
} from "@/lib/arie/original-types"
import { CONTEXT_BUILDER_VERSION } from "@/lib/arie/types"
import { ORIGINAL_PREDICTION_VERSION } from "@/lib/arie/original-prediction"
import type { ContextPackage } from "@/lib/arie/types"

export const ORIGINALS_CORPUS_VERSION = "originals-v1"
export const VALIDATION_LAYER_VERSION = "validation-batch@v1.0"

export type CorpusItem = {
  id: string
  authorHandle: string
  text: string
  sourceUrl?: string | null
  sourcePostId?: string | null
  tags?: string[]
  notes?: string
  corrections?: string[]
  corroborations?: Array<{ handle: string; text: string; contradicts?: boolean }>
  heatHint?: number | null
  inputOrigin?: "seed_fixture" | "uploaded"
}

export type CorpusFile = {
  corpusVersion: string
  description?: string
  items: CorpusItem[]
}

export type ValidationRunMode = "score_only" | "full_pipeline"

export type SampleConfig = {
  /** Max cases selected for human review (edge + stratified). */
  maxReview: number
  /** Always include items tagged regression. */
  alwaysIncludeRegressionTags: boolean
}

export const DEFAULT_SAMPLE_CONFIG: SampleConfig = {
  maxReview: 25,
  alwaysIncludeRegressionTags: true,
}

export type FrozenArieVersions = {
  validationLayer: string
  contextBuilder: string
  constitution: string
  conceptPrompt: string
  writerPrompt: string
  qaPrompt: string
  prediction: string
  capturedAt: string
}

export type PipelineResultSnapshot = {
  opportunityId: string | null
  originalStatus: string | null
  originalScore: number | null
  eligible: boolean | null
  factualConfidence: number | null
  writerMode: string | null
  sourceReliabilityClass: string | null
  sourceDistributionPriority: string | null
  claimStatuses: Record<string, number>
  evidenceSummary: {
    confirmed: number
    reported: number
    uncertain: number
    contradicted: number
    missingEvidence: string[]
  } | null
  selectedConcept: { id: string; format: string; hook: string } | null
  draftText: string | null
  qaPassed: boolean | null
  qaIssues: Array<{ type?: string; severity?: string; status?: string; claim?: string }>
  visualEligible: boolean | null
  visualReason: string | null
  stages: {
    ingest: "ok" | "error" | "skipped"
    concepts: "ok" | "error" | "skipped"
    draft: "ok" | "error" | "skipped"
    qa: "ok" | "error" | "skipped"
  }
  errors: string[]
  ranAt: string
}

function normalizeHandle(h: string | null | undefined): string {
  return (h ?? "").replace(/^@/, "").trim().toLowerCase()
}

export function captureArieVersions(): FrozenArieVersions {
  return {
    validationLayer: VALIDATION_LAYER_VERSION,
    contextBuilder: CONTEXT_BUILDER_VERSION,
    constitution: ARIE_CONSTITUTION_VERSION,
    conceptPrompt: ORIGINAL_CONCEPT_PROMPT_VERSION,
    writerPrompt: ORIGINAL_WRITER_PROMPT_VERSION,
    qaPrompt: ORIGINAL_QA_PROMPT_VERSION,
    prediction: ORIGINAL_PREDICTION_VERSION,
    capturedAt: new Date().toISOString(),
  }
}

export async function loadSeedCorpus(
  corpusVersion: string = ORIGINALS_CORPUS_VERSION,
): Promise<CorpusFile> {
  const filePath = path.join(
    process.cwd(),
    "docs/arie/corpus",
    `${corpusVersion.split("+")[0]}.json`,
  )
  const raw = await readFile(filePath, "utf8")
  const parsed = JSON.parse(raw) as CorpusFile
  if (!parsed?.items?.length) throw new Error("corpus_empty")
  return {
    corpusVersion: parsed.corpusVersion || corpusVersion,
    description: parsed.description,
    items: parsed.items.map((it) => ({
      ...it,
      authorHandle: normalizeHandle(it.authorHandle),
      inputOrigin: "seed_fixture" as const,
    })),
  }
}

export function parseUploadedCorpus(raw: unknown): CorpusItem[] {
  let arr: unknown[]
  if (Array.isArray(raw)) arr = raw
  else if (raw && typeof raw === "object" && Array.isArray((raw as CorpusFile).items)) {
    arr = (raw as CorpusFile).items
  } else {
    throw new Error("upload_must_be_array_or_items_object")
  }

  const items: CorpusItem[] = []
  for (let i = 0; i < arr.length; i++) {
    const row = arr[i]
    if (!row || typeof row !== "object") throw new Error(`item_${i}_invalid`)
    const o = row as Record<string, unknown>
    const text = typeof o.text === "string" ? o.text.trim() : ""
    const handle = normalizeHandle(
      typeof o.authorHandle === "string"
        ? o.authorHandle
        : typeof o.handle === "string"
          ? o.handle
          : "",
    )
    if (!text) throw new Error(`item_${i}_missing_text`)
    if (!handle) throw new Error(`item_${i}_missing_handle`)
    const id =
      typeof o.id === "string" && o.id.trim()
        ? o.id.trim()
        : `up_${createHash("sha1").update(`${handle}|${text}`).digest("hex").slice(0, 12)}`
    items.push({
      id,
      authorHandle: handle,
      text,
      sourceUrl: typeof o.sourceUrl === "string" ? o.sourceUrl : null,
      sourcePostId: typeof o.sourcePostId === "string" ? o.sourcePostId : null,
      tags: Array.isArray(o.tags) ? o.tags.map(String) : [],
      notes: typeof o.notes === "string" ? o.notes : undefined,
      corrections: Array.isArray(o.corrections) ? o.corrections.map(String) : undefined,
      heatHint: typeof o.heatHint === "number" ? o.heatHint : null,
      inputOrigin: "uploaded",
    })
  }
  return items
}

export function corpusHash(items: CorpusItem[]): string {
  const normalized = items
    .map((i) => ({
      id: i.id,
      authorHandle: normalizeHandle(i.authorHandle),
      text: i.text.trim(),
      corrections: i.corrections ?? [],
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex").slice(0, 12)
}

export function sourceDistribution(items: CorpusItem[]): Record<string, number> {
  const dist: Record<string, number> = {}
  for (const it of items) {
    const h = normalizeHandle(it.authorHandle) || "unknown"
    dist[h] = (dist[h] ?? 0) + 1
  }
  return dist
}

export function resolveCorpusVersion(opts: {
  includeSeed: boolean
  seedVersion?: string
  uploaded: CorpusItem[]
}): string {
  const seed = opts.includeSeed ? opts.seedVersion || ORIGINALS_CORPUS_VERSION : null
  if (seed && opts.uploaded.length) {
    return `${seed}+upload:${corpusHash(opts.uploaded)}`
  }
  if (seed) return seed
  if (opts.uploaded.length) return `upload:${corpusHash(opts.uploaded)}`
  throw new Error("empty_corpus")
}

/** Merge seed + upload; rename upload on id collision with different text. */
export function mergeCorpusItems(seed: CorpusItem[], uploaded: CorpusItem[]): CorpusItem[] {
  const byId = new Map<string, CorpusItem>()
  for (const s of seed) byId.set(s.id, { ...s, inputOrigin: "seed_fixture" })
  for (const u of uploaded) {
    let id = u.id
    if (byId.has(id) && byId.get(id)!.text.trim() !== u.text.trim()) {
      id = `${u.id}__upload`
    }
    byId.set(id, { ...u, id, inputOrigin: "uploaded" })
  }
  return [...byId.values()]
}

export async function createValidationBatch(input: {
  name: string
  includeSeed?: boolean
  seedVersion?: string
  uploaded?: unknown
  runMode?: ValidationRunMode
  sampleConfig?: Partial<SampleConfig>
  notes?: string
  createdByEmail?: string | null
}): Promise<{ batchId: string; corpusVersion: string; itemCount: number }> {
  const uploaded = input.uploaded ? parseUploadedCorpus(input.uploaded) : []
  const includeSeed = input.includeSeed !== false || uploaded.length === 0
  const seedFile = includeSeed
    ? await loadSeedCorpus(input.seedVersion || ORIGINALS_CORPUS_VERSION)
    : { corpusVersion: ORIGINALS_CORPUS_VERSION, items: [] as CorpusItem[] }

  const items = mergeCorpusItems(seedFile.items, uploaded)
  if (!items.length) throw new Error("empty_corpus")

  const corpusVersion = resolveCorpusVersion({
    includeSeed: seedFile.items.length > 0,
    seedVersion: seedFile.corpusVersion,
    uploaded,
  })

  const sampleConfig: SampleConfig = {
    ...DEFAULT_SAMPLE_CONFIG,
    ...(input.sampleConfig ?? {}),
  }

  const batch = await prisma.arieValidationBatch.create({
    data: {
      name: input.name.trim() || `validation-${new Date().toISOString().slice(0, 10)}`,
      corpusVersion,
      corpusSnapshot: {
        corpusVersion,
        capturedAt: new Date().toISOString(),
        items,
      } as unknown as Prisma.InputJsonValue,
      sourceDistribution: sourceDistribution(items) as unknown as Prisma.InputJsonValue,
      status: "CREATED",
      runMode: input.runMode === "full_pipeline" ? "full_pipeline" : "score_only",
      sampleConfig: sampleConfig as unknown as Prisma.InputJsonValue,
      notes: input.notes ?? null,
      createdByEmail: input.createdByEmail ?? null,
      cases: {
        create: items.map((it) => ({
          corpusItemId: it.id,
          sourceHandle: normalizeHandle(it.authorHandle),
          sourceText: it.text,
          sourceUrl: it.sourceUrl ?? null,
          sourcePostId: it.sourcePostId ?? null,
          inputOrigin: it.inputOrigin ?? (includeSeed ? "seed_fixture" : "uploaded"),
          tags: it.tags ?? [],
          status: "pending",
        })),
      },
    },
  })

  return { batchId: batch.id, corpusVersion, itemCount: items.length }
}

function claimStatusHistogram(pkg: ContextPackage | null): Record<string, number> {
  const out: Record<string, number> = {
    VERIFIED: 0,
    REPORTED: 0,
    UNVERIFIED: 0,
    CONTRADICTED: 0,
    UNKNOWN: 0,
  }
  for (const c of pkg?.claims ?? []) {
    out[c.status] = (out[c.status] ?? 0) + 1
  }
  return out
}

function snapshotFromPackage(
  pkg: ContextPackage | null,
  base: Partial<PipelineResultSnapshot> & {
    opportunityId: string | null
    originalStatus: string | null
    originalScore: number | null
    eligible: boolean | null
  },
): PipelineResultSnapshot {
  return {
    opportunityId: base.opportunityId,
    originalStatus: base.originalStatus,
    originalScore: base.originalScore,
    eligible: base.eligible,
    factualConfidence: pkg?.factualConfidence ?? null,
    writerMode: pkg?.writerMode ?? null,
    sourceReliabilityClass: pkg?.sourceProvenance?.reliabilityClass ?? null,
    sourceDistributionPriority: pkg?.sourceProvenance?.distributionPriority ?? null,
    claimStatuses: claimStatusHistogram(pkg),
    evidenceSummary: pkg?.evidence
      ? {
          confirmed: pkg.evidence.confirmed.length,
          reported: pkg.evidence.reported.length,
          uncertain: pkg.evidence.uncertain.length,
          contradicted: pkg.evidence.contradicted.length,
          missingEvidence: pkg.evidence.missingEvidence,
        }
      : null,
    selectedConcept: base.selectedConcept ?? null,
    draftText: base.draftText ?? null,
    qaPassed: base.qaPassed ?? null,
    qaIssues: base.qaIssues ?? [],
    visualEligible: base.visualEligible ?? null,
    visualReason: base.visualReason ?? null,
    stages: base.stages ?? {
      ingest: "skipped",
      concepts: "skipped",
      draft: "skipped",
      qa: "skipped",
    },
    errors: base.errors ?? [],
    ranAt: new Date().toISOString(),
  }
}

/**
 * Deterministic edge-case / stratified sampler.
 * Metrics always cover the full batch; review subset is for human grading efficiency.
 * Does not encode “BoinkBuzz is unreliable” — uses claim/evidence dimensions.
 */
export function selectCasesForReview(
  cases: Array<{
    id: string
    tags: string[]
    inputOrigin: string
    pipelineResult: PipelineResultSnapshot | null
    status: string
  }>,
  config: SampleConfig = DEFAULT_SAMPLE_CONFIG,
): Map<string, { reasons: string[]; priority: number }> {
  const selected = new Map<string, { reasons: string[]; priority: number }>()

  const bump = (id: string, reason: string, priority: number) => {
    const prev = selected.get(id)
    if (!prev) selected.set(id, { reasons: [reason], priority })
    else {
      if (!prev.reasons.includes(reason)) prev.reasons.push(reason)
      prev.priority = Math.max(prev.priority, priority)
    }
  }

  for (const c of cases) {
    if (c.status === "pipeline_error") {
      bump(c.id, "pipeline_error", 100)
      continue
    }
    const r = c.pipelineResult
    if (!r) continue

    if (config.alwaysIncludeRegressionTags && c.tags.some((t) => /regression/i.test(t))) {
      bump(c.id, "regression_fixture", 95)
    }
    if ((r.claimStatuses.CONTRADICTED ?? 0) > 0) bump(c.id, "contradicted_claim", 90)
    if ((r.claimStatuses.UNVERIFIED ?? 0) > 0) bump(c.id, "unverified_claim", 80)
    if (
      typeof r.originalScore === "number" &&
      r.originalScore >= 70 &&
      typeof r.factualConfidence === "number" &&
      r.factualConfidence < 55
    ) {
      bump(c.id, "high_opp_low_confidence", 85)
    }
    if (r.writerMode === "REPORTED_EVENT" || r.writerMode === "DISCUSSION") {
      bump(c.id, `writer_mode_${r.writerMode}`, 70)
    }
    if (r.qaPassed === false) bump(c.id, "qa_failed", 88)
    if (r.visualEligible === false && r.visualReason === "missing_numeric_data") {
      bump(c.id, "visual_missing_numeric", 60)
    }
    if (r.sourceReliabilityClass === "UNKNOWN") bump(c.id, "unknown_reliability", 65)
    if (r.eligible === false && (r.originalScore ?? 0) >= 40) {
      bump(c.id, "borderline_ineligible", 55)
    }
    if (r.eligible && r.writerMode === "VERIFIED_EVENT" && (r.originalScore ?? 0) >= 60) {
      bump(c.id, "control_verified_framing", 40)
    }
    if (r.sourceReliabilityClass === "TRADE" && r.eligible) {
      bump(c.id, "control_trade_source", 35)
    }
    if (r.sourceDistributionPriority === "HIGH" && r.sourceReliabilityClass === "AGGREGATOR") {
      bump(c.id, "high_distribution_aggregator", 75)
    }
  }

  const ranked = [...selected.entries()].sort((a, b) => b[1].priority - a[1].priority)
  if (ranked.length <= config.maxReview) return selected

  const kept = new Map<string, { reasons: string[]; priority: number }>()
  const reasonSeen = new Set<string>()
  for (const [id, meta] of ranked) {
    if (kept.size >= config.maxReview) break
    const novel = meta.reasons.find((r) => !reasonSeen.has(r))
    if (novel || meta.priority >= 85) {
      kept.set(id, meta)
      meta.reasons.forEach((r) => reasonSeen.add(r))
    }
  }
  for (const [id, meta] of ranked) {
    if (kept.size >= config.maxReview) break
    kept.set(id, meta)
  }
  return kept
}

export function computeAggregateMetrics(
  cases: Array<{
    status: string
    selectedForReview: boolean
    humanGrade: string | null
    scoreTruthfulness: number | null
    scoreUsefulness: number | null
    scoreFraming: number | null
    scoreBrandVoice: number | null
    pipelineResult: PipelineResultSnapshot | null
    tags: string[]
    sourceHandle: string | null
  }>,
): Record<string, unknown> {
  const done = cases.filter((c) => c.pipelineResult && c.status !== "pending")
  const graded = cases.filter((c) => c.humanGrade)
  const review = cases.filter((c) => c.selectedForReview)

  const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
  for (const g of graded) {
    if (g.humanGrade && gradeCounts[g.humanGrade] != null) gradeCounts[g.humanGrade]++
  }
  const ab = gradeCounts.A + gradeCounts.B
  const abRate = graded.length ? Math.round((ab / graded.length) * 1000) / 10 : null

  const byHandle: Record<
    string,
    { n: number; eligible: number; avgScore: number; ab?: number; graded?: number }
  > = {}
  for (const c of done) {
    const h = c.sourceHandle || "unknown"
    byHandle[h] ??= { n: 0, eligible: 0, avgScore: 0 }
    byHandle[h].n++
    if (c.pipelineResult?.eligible) byHandle[h].eligible++
    byHandle[h].avgScore += c.pipelineResult?.originalScore ?? 0
  }
  for (const h of Object.keys(byHandle)) {
    const row = byHandle[h]!
    row.avgScore = row.n ? Math.round(row.avgScore / row.n) : 0
  }
  for (const c of graded) {
    const h = c.sourceHandle || "unknown"
    byHandle[h] ??= { n: 0, eligible: 0, avgScore: 0, ab: 0, graded: 0 }
    byHandle[h].graded = (byHandle[h].graded ?? 0) + 1
    if (c.humanGrade === "A" || c.humanGrade === "B") {
      byHandle[h].ab = (byHandle[h].ab ?? 0) + 1
    }
  }

  const avg = (xs: number[]) =>
    xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null

  return {
    totalCases: cases.length,
    pipelineDone: done.length,
    pipelineErrors: cases.filter((c) => c.status === "pipeline_error").length,
    selectedForReview: review.length,
    graded: graded.length,
    gradeCounts,
    abRatePercent: abRate,
    eligibleRatePercent: done.length
      ? Math.round(
          (done.filter((c) => c.pipelineResult?.eligible).length / done.length) * 1000,
        ) / 10
      : null,
    avgOpportunityScore: avg(
      done
        .map((c) => c.pipelineResult?.originalScore)
        .filter((n): n is number => typeof n === "number"),
    ),
    avgFactualConfidence: avg(
      done
        .map((c) => c.pipelineResult?.factualConfidence)
        .filter((n): n is number => typeof n === "number"),
    ),
    writerModeCounts: done.reduce(
      (acc, c) => {
        const m = c.pipelineResult?.writerMode ?? "unknown"
        acc[m] = (acc[m] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    ),
    claimStatusTotals: done.reduce(
      (acc, c) => {
        for (const [k, v] of Object.entries(c.pipelineResult?.claimStatuses ?? {})) {
          acc[k] = (acc[k] ?? 0) + v
        }
        return acc
      },
      {} as Record<string, number>,
    ),
    avgSubscores: {
      truthfulness: avg(
        graded.map((c) => c.scoreTruthfulness).filter((n): n is number => typeof n === "number"),
      ),
      usefulness: avg(
        graded.map((c) => c.scoreUsefulness).filter((n): n is number => typeof n === "number"),
      ),
      framing: avg(
        graded.map((c) => c.scoreFraming).filter((n): n is number => typeof n === "number"),
      ),
      brandVoice: avg(
        graded.map((c) => c.scoreBrandVoice).filter((n): n is number => typeof n === "number"),
      ),
    },
    bySourceHandle: byHandle,
    computedAt: new Date().toISOString(),
  }
}

export async function runValidationBatch(
  batchId: string,
  opts?: { limit?: number },
): Promise<{
  processed: number
  errors: number
  status: string
}> {
  const batch = await prisma.arieValidationBatch.findUnique({
    where: { id: batchId },
    include: { cases: { orderBy: { createdAt: "asc" } } },
  })
  if (!batch) throw new Error("batch_not_found")
  if (batch.status === "COMPLETE") throw new Error("batch_immutable_complete")
  if (batch.status !== "CREATED" && batch.status !== "RUNNING" && batch.status !== "FAILED") {
    throw new Error("batch_pipeline_frozen")
  }

  const versions = captureArieVersions()
  await prisma.arieValidationBatch.update({
    where: { id: batchId },
    data: {
      status: "RUNNING",
      startedAt: batch.startedAt ?? new Date(),
      arieVersions: versions as unknown as Prisma.InputJsonValue,
    },
  })

  const snapshot = batch.corpusSnapshot as { items?: CorpusItem[] }
  const itemsById = new Map((snapshot.items ?? []).map((i) => [i.id, i]))
  const pending = batch.cases.filter(
    (c) => c.status === "pending" || c.status === "pipeline_error",
  )
  const toRun = typeof opts?.limit === "number" ? pending.slice(0, opts.limit) : pending

  let processed = 0
  let errors = 0

  for (const c of toRun) {
    const item = itemsById.get(c.corpusItemId)
    const text = item?.text ?? c.sourceText
    const handle = item?.authorHandle ?? c.sourceHandle
    const errorsAcc: string[] = []
    const stages: PipelineResultSnapshot["stages"] = {
      ingest: "skipped",
      concepts: "skipped",
      draft: "skipped",
      qa: "skipped",
    }

    try {
      const externalId = `validation-${batchId}-${c.corpusItemId}-${randomUUID().slice(0, 8)}`
      const ingested = await ingestOriginalOpportunity({
        text,
        authorHandle: handle,
        externalId,
        sourceUrl: item?.sourceUrl ?? c.sourceUrl,
        corrections: item?.corrections,
        corroborations: item?.corroborations,
        heatHint: item?.heatHint,
        dedupeNamespace: `val:${batchId}`,
        payload: {
          validationBatchId: batchId,
          validationCaseId: c.id,
          corpusItemId: c.corpusItemId,
          arieContentType: "original",
          sourceUrl: item?.sourceUrl ?? c.sourceUrl,
        },
      })

      if (!ingested.ok) {
        stages.ingest = "error"
        errorsAcc.push(ingested.reason)
        await prisma.arieValidationCase.update({
          where: { id: c.id },
          data: {
            status: "pipeline_error",
            errorMessage: ingested.reason,
            pipelineResult: snapshotFromPackage(null, {
              opportunityId: null,
              originalStatus: null,
              originalScore: null,
              eligible: null,
              stages,
              errors: errorsAcc,
            }) as unknown as Prisma.InputJsonValue,
          },
        })
        errors++
        processed++
        continue
      }

      stages.ingest = "ok"
      const oppId = ingested.opportunityId

      let pkgRow = await prisma.arieContextPackage.findFirst({
        where: { opportunityId: oppId },
        orderBy: { createdAt: "desc" },
      })
      let pkg = (pkgRow?.package as unknown as ContextPackage) ?? null

      let selectedConcept: PipelineResultSnapshot["selectedConcept"] = null
      let draftText: string | null = null
      let qaPassed: boolean | null = null
      let qaIssues: PipelineResultSnapshot["qaIssues"] = []
      let visualEligible: boolean | null = null
      let visualReason: string | null = null

      if (batch.runMode === "full_pipeline" && ingested.eligible) {
        const concepts = await generateConceptsForOpportunity(oppId, { bypassGovernor: true })
        if (concepts.ok) {
          stages.concepts = "ok"
          selectedConcept = {
            id: concepts.selected.id,
            format: concepts.selected.format,
            hook: concepts.selected.hook,
          }
          const draft = await generateDraftForOpportunity(oppId, { bypassGovernor: true })
          if (draft.ok) {
            stages.draft = "ok"
            draftText = draft.draft.text
            visualEligible = draft.visual?.eligible ?? null
            visualReason = draft.visual?.reason ?? null
            const qa = await runQaForOpportunity(oppId, { bypassGovernor: true })
            if (qa.ok) {
              stages.qa = "ok"
              qaPassed = qa.qa.passed
              const detIssues = qa.qa.deterministic.issues ?? []
              const semIssues = qa.qa.semantic?.issues ?? []
              qaIssues = [...detIssues, ...semIssues].map((i) => ({
                type: i.type,
                severity: i.severity,
                status: i.status,
                claim: i.claim,
              }))
            } else {
              stages.qa = "error"
              errorsAcc.push(qa.reason)
            }
          } else {
            stages.draft = "error"
            errorsAcc.push(draft.reason)
          }
        } else {
          stages.concepts = concepts.reason === "not_eligible" ? "skipped" : "error"
          if (concepts.reason !== "not_eligible") errorsAcc.push(concepts.reason)
        }
      }

      const opp = await prisma.arieOpportunity.findUnique({ where: { id: oppId } })
      pkgRow = await prisma.arieContextPackage.findFirst({
        where: { opportunityId: oppId },
        orderBy: { createdAt: "desc" },
      })
      if (pkgRow) pkg = pkgRow.package as unknown as ContextPackage

      if (!draftText && opp?.finalDraft) draftText = opp.finalDraft
      if (opp?.visualSpec && typeof opp.visualSpec === "object") {
        const vs = opp.visualSpec as { eligible?: boolean; reason?: string }
        if (visualEligible == null) visualEligible = vs.eligible ?? null
        if (!visualReason) visualReason = vs.reason ?? null
      }
      if (qaPassed == null && opp?.qaResult && typeof opp.qaResult === "object") {
        qaPassed = Boolean((opp.qaResult as { passed?: boolean }).passed)
      }
      if (!selectedConcept && opp?.selectedConcept && typeof opp.selectedConcept === "object") {
        const sc = opp.selectedConcept as { id?: string; format?: string; hook?: string }
        if (sc.id && sc.format && sc.hook) {
          selectedConcept = { id: sc.id, format: sc.format, hook: sc.hook }
        }
      }

      const result = snapshotFromPackage(pkg, {
        opportunityId: oppId,
        originalStatus: opp?.originalStatus ?? ingested.originalStatus,
        originalScore: opp?.originalScore ?? ingested.originalScore,
        eligible: ingested.eligible,
        selectedConcept,
        draftText,
        qaPassed,
        qaIssues,
        visualEligible,
        visualReason,
        stages,
        errors: errorsAcc,
      })

      await prisma.arieValidationCase.update({
        where: { id: c.id },
        data: {
          opportunityId: oppId,
          status: "pipeline_done",
          errorMessage: errorsAcc.length ? errorsAcc.join("; ") : null,
          pipelineResult: result as unknown as Prisma.InputJsonValue,
        },
      })
      processed++
    } catch (e) {
      errors++
      processed++
      await prisma.arieValidationCase.update({
        where: { id: c.id },
        data: {
          status: "pipeline_error",
          errorMessage: e instanceof Error ? e.message : String(e),
          pipelineResult: snapshotFromPackage(null, {
            opportunityId: null,
            originalStatus: null,
            originalScore: null,
            eligible: null,
            stages: { ...stages, ingest: "error" },
            errors: [e instanceof Error ? e.message : String(e)],
          }) as unknown as Prisma.InputJsonValue,
        },
      })
    }
  }

  const remaining = await prisma.arieValidationCase.count({
    where: { batchId, status: { in: ["pending"] } },
  })

  if (remaining > 0) {
    return { processed, errors, status: "RUNNING" }
  }

  const allCases = await prisma.arieValidationCase.findMany({ where: { batchId } })
  const sampleConfig = {
    ...DEFAULT_SAMPLE_CONFIG,
    ...((batch.sampleConfig as Partial<SampleConfig>) ?? {}),
  }
  const selected = selectCasesForReview(
    allCases.map((c) => ({
      id: c.id,
      tags: c.tags,
      inputOrigin: c.inputOrigin,
      status: c.status,
      pipelineResult: c.pipelineResult as PipelineResultSnapshot | null,
    })),
    sampleConfig,
  )

  for (const c of allCases) {
    const sel = selected.get(c.id)
    await prisma.arieValidationCase.update({
      where: { id: c.id },
      data: {
        selectedForReview: Boolean(sel),
        sampleReasons: sel?.reasons ?? [],
        reviewPriority: sel?.priority ?? 0,
      },
    })
  }

  const refreshed = await prisma.arieValidationCase.findMany({ where: { batchId } })
  const metrics = computeAggregateMetrics(
    refreshed.map((c) => ({
      status: c.status,
      selectedForReview: c.selectedForReview,
      humanGrade: c.humanGrade,
      scoreTruthfulness: c.scoreTruthfulness,
      scoreUsefulness: c.scoreUsefulness,
      scoreFraming: c.scoreFraming,
      scoreBrandVoice: c.scoreBrandVoice,
      pipelineResult: c.pipelineResult as PipelineResultSnapshot | null,
      tags: c.tags,
      sourceHandle: c.sourceHandle,
    })),
  )

  await prisma.arieValidationBatch.update({
    where: { id: batchId },
    data: {
      status: "SAMPLED",
      aggregateMetrics: metrics as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
    },
  })

  return { processed, errors, status: "SAMPLED" }
}

export async function gradeValidationCase(input: {
  caseId: string
  humanGrade: "A" | "B" | "C" | "D"
  scoreTruthfulness?: number
  scoreUsefulness?: number
  scoreFraming?: number
  scoreBrandVoice?: number
  gradeNotes?: string
  gradedByEmail?: string | null
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const row = await prisma.arieValidationCase.findUnique({
    where: { id: input.caseId },
    include: { batch: true },
  })
  if (!row) return { ok: false, reason: "not_found" }
  if (!row.selectedForReview) return { ok: false, reason: "not_in_review_subset" }
  if (row.batch.status === "CREATED" || row.batch.status === "RUNNING") {
    return { ok: false, reason: "batch_not_ready" }
  }

  const clamp = (n: number | undefined) =>
    typeof n === "number" ? Math.max(1, Math.min(5, Math.round(n))) : null

  await prisma.arieValidationCase.update({
    where: { id: input.caseId },
    data: {
      humanGrade: input.humanGrade,
      scoreTruthfulness: clamp(input.scoreTruthfulness),
      scoreUsefulness: clamp(input.scoreUsefulness),
      scoreFraming: clamp(input.scoreFraming),
      scoreBrandVoice: clamp(input.scoreBrandVoice),
      gradeNotes: input.gradeNotes?.trim() || null,
      gradedAt: new Date(),
      gradedByEmail: input.gradedByEmail ?? null,
      status: "graded",
    },
  })

  const all = await prisma.arieValidationCase.findMany({ where: { batchId: row.batchId } })
  const metrics = computeAggregateMetrics(
    all.map((c) => ({
      status: c.status,
      selectedForReview: c.selectedForReview,
      humanGrade: c.id === input.caseId ? input.humanGrade : c.humanGrade,
      scoreTruthfulness:
        c.id === input.caseId ? clamp(input.scoreTruthfulness) : c.scoreTruthfulness,
      scoreUsefulness: c.id === input.caseId ? clamp(input.scoreUsefulness) : c.scoreUsefulness,
      scoreFraming: c.id === input.caseId ? clamp(input.scoreFraming) : c.scoreFraming,
      scoreBrandVoice: c.id === input.caseId ? clamp(input.scoreBrandVoice) : c.scoreBrandVoice,
      pipelineResult: c.pipelineResult as PipelineResultSnapshot | null,
      tags: c.tags,
      sourceHandle: c.sourceHandle,
    })),
  )

  const reviewTotal = all.filter((c) => c.selectedForReview).length
  const gradedTotal = all.filter(
    (c) => c.selectedForReview && (c.id === input.caseId || c.humanGrade),
  ).length
  const nextStatus = reviewTotal > 0 && gradedTotal >= reviewTotal ? "COMPLETE" : "GRADING"

  await prisma.arieValidationBatch.update({
    where: { id: row.batchId },
    data: {
      status: nextStatus,
      aggregateMetrics: metrics as unknown as Prisma.InputJsonValue,
    },
  })

  return { ok: true }
}

export function serializeCase(c: {
  id: string
  batchId: string
  corpusItemId: string
  sourceHandle: string | null
  sourceText: string
  sourceUrl: string | null
  sourcePostId: string | null
  inputOrigin: string
  tags: string[]
  opportunityId: string | null
  pipelineResult: unknown
  sampleReasons: string[]
  selectedForReview: boolean
  reviewPriority: number
  status: string
  errorMessage: string | null
  humanGrade: string | null
  scoreTruthfulness: number | null
  scoreUsefulness: number | null
  scoreFraming: number | null
  scoreBrandVoice: number | null
  gradeNotes: string | null
  gradedAt: Date | null
  gradedByEmail: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: c.id,
    batchId: c.batchId,
    corpusItemId: c.corpusItemId,
    sourceHandle: c.sourceHandle,
    sourceText: c.sourceText,
    sourceUrl: c.sourceUrl,
    sourcePostId: c.sourcePostId,
    inputOrigin: c.inputOrigin,
    tags: c.tags,
    opportunityId: c.opportunityId,
    pipelineResult: c.pipelineResult,
    sampleReasons: c.sampleReasons,
    selectedForReview: c.selectedForReview,
    reviewPriority: c.reviewPriority,
    status: c.status,
    errorMessage: c.errorMessage,
    humanGrade: c.humanGrade,
    scoreTruthfulness: c.scoreTruthfulness,
    scoreUsefulness: c.scoreUsefulness,
    scoreFraming: c.scoreFraming,
    scoreBrandVoice: c.scoreBrandVoice,
    gradeNotes: c.gradeNotes,
    gradedAt: c.gradedAt?.toISOString() ?? null,
    gradedByEmail: c.gradedByEmail,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

export function serializeBatch(
  batch: {
    id: string
    name: string
    corpusVersion: string
    corpusSnapshot: unknown
    arieVersions: unknown
    sourceDistribution: unknown
    status: string
    runMode: string
    sampleConfig: unknown
    aggregateMetrics: unknown
    startedAt: Date | null
    completedAt: Date | null
    createdByEmail: string | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
    _count?: { cases: number }
  },
  cases?: ReturnType<typeof serializeCase>[],
) {
  return {
    id: batch.id,
    name: batch.name,
    corpusVersion: batch.corpusVersion,
    corpusSnapshot: batch.corpusSnapshot,
    arieVersions: batch.arieVersions,
    sourceDistribution: batch.sourceDistribution,
    status: batch.status,
    runMode: batch.runMode,
    sampleConfig: batch.sampleConfig,
    aggregateMetrics: batch.aggregateMetrics,
    startedAt: batch.startedAt?.toISOString() ?? null,
    completedAt: batch.completedAt?.toISOString() ?? null,
    createdByEmail: batch.createdByEmail,
    notes: batch.notes,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
    caseCount: batch._count?.cases ?? cases?.length ?? null,
    cases,
  }
}
