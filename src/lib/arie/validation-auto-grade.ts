/**
 * Validation machine grading + copyable analytics report.
 * Does NOT mutate pipelineResult / corpusSnapshot / humanGrade.
 * Does NOT publish.
 */

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { groqJsonCompletion } from "@/lib/arie/groq"
import type { PipelineResultSnapshot } from "@/lib/arie/validation-batch"
import { computeAggregateMetrics } from "@/lib/arie/validation-batch"

export const MACHINE_GRADE_PROMPT_VERSION = "validation-machine-grade@v1.0"

export type MachineEval = {
  grade: "A" | "B" | "C" | "D"
  scores: {
    truthfulness: number
    usefulness: number
    framing: number
    brandVoice: number
  }
  summary: string
  strengths: string[]
  failures: string[]
  model: string
  promptVersion: string
  gradedAt: string
  deterministicFlags: string[]
}

function clamp15(n: unknown, fallback = 3): number {
  const v = typeof n === "number" ? n : fallback
  return Math.max(1, Math.min(5, Math.round(v)))
}

function asGrade(v: unknown): "A" | "B" | "C" | "D" {
  if (v === "A" || v === "B" || v === "C" || v === "D") return v
  return "C"
}

/** Deterministic red flags used to floor LLM optimism. */
export function deterministicMachineFlags(input: {
  sourceText: string
  tags: string[]
  pipelineResult: PipelineResultSnapshot | null
  status: string
}): string[] {
  const flags: string[] = []
  const r = input.pipelineResult
  if (input.status === "pipeline_error" || !r) {
    flags.push("pipeline_error")
    return flags
  }
  if (r.stages?.ingest === "error") flags.push("ingest_error")
  if (r.qaPassed === false) flags.push("qa_failed")
  for (const iss of r.qaIssues ?? []) {
    if (iss.type === "UNVERIFIED_ASSERTION") flags.push("unverified_assertion")
    if (iss.type === "CONTRADICTED_ASSERTION") flags.push("contradicted_assertion")
    if (iss.type === "FABRICATED_NUMBER") flags.push("fabricated_number")
    if (iss.type === "FAKE_CONFIRMATION") flags.push("fake_confirmation")
  }
  if ((r.claimStatuses?.CONTRADICTED ?? 0) > 0 && r.draftText) {
    if (/iron\s*spider|confirmed|will return|will don/i.test(r.draftText) && !/report|according to|if (it happens|confirmed)/i.test(r.draftText)) {
      flags.push("draft_may_assert_contested_claim")
    }
  }
  if (input.tags.some((t) => /should_ignore|gossip|culture_war|politics/i.test(t))) {
    if (r.eligible && r.draftText) flags.push("engaged_should_ignore_topic")
  }
  if (r.eligible === false && !r.draftText) flags.push("correctly_ineligible_or_no_draft")
  if (r.writerMode === "REPORTED_EVENT" && r.draftText && /is reporting|reportedly|if (it happens|confirmed)|according to/i.test(r.draftText)) {
    flags.push("good_attribution_signal")
  }
  if (typeof r.originalScore === "number" && r.originalScore >= 70 && typeof r.factualConfidence === "number" && r.factualConfidence < 55) {
    flags.push("high_opp_low_confidence")
  }
  return [...new Set(flags)]
}

function applyDeterministicFloor(
  grade: "A" | "B" | "C" | "D",
  flags: string[],
): "A" | "B" | "C" | "D" {
  const rank = { A: 4, B: 3, C: 2, D: 1 }
  let g = grade
  const floor = (max: "A" | "B" | "C" | "D") => {
    if (rank[g] > rank[max]) g = max
  }
  if (flags.includes("fabricated_number") || flags.includes("contradicted_assertion")) floor("D")
  else if (flags.includes("unverified_assertion") || flags.includes("fake_confirmation")) floor("C")
  else if (flags.includes("engaged_should_ignore_topic")) floor("D")
  else if (flags.includes("qa_failed")) floor("C")
  else if (flags.includes("pipeline_error") || flags.includes("ingest_error")) floor("D")
  return g
}

async function llmGradeCase(input: {
  sourceHandle: string | null
  sourceText: string
  tags: string[]
  pipelineResult: PipelineResultSnapshot | null
  flags: string[]
}): Promise<Omit<MachineEval, "gradedAt" | "promptVersion" | "deterministicFlags"> | { error: string }> {
  const r = input.pipelineResult
  const system = `You are ARIE Validation Judge for ActorRating original posts (or the decision not to post).
SOURCE CLAIM ≠ VERIFIED FACT.
Grade A/B/C/D:

A = happy to ship as ActorRating (truthful framing, AR advantage)
B = acceptable with minor issues
C = not shippable without rewrite
D = harmful / false / off-brand / bullshit

Score 1-5: truthfulness, usefulness, framing, brandVoice.
If there is no draft, grade the pipeline decision (eligible vs ignore) + evidence posture.
Never invent ActorRating facts. Prefer attribution for REPORTED claims.
Return JSON only: { grade, scores:{truthfulness,usefulness,framing,brandVoice}, summary, strengths[], failures[] }`

  const user = JSON.stringify({
    instruction: "Grade this validation case.",
    sourceHandle: input.sourceHandle,
    sourceText: input.sourceText,
    tags: input.tags,
    deterministicFlags: input.flags,
    pipeline: r
      ? {
          originalScore: r.originalScore,
          eligible: r.eligible,
          factualConfidence: r.factualConfidence,
          writerMode: r.writerMode,
          sourceReliabilityClass: r.sourceReliabilityClass,
          sourceDistributionPriority: r.sourceDistributionPriority,
          claimStatuses: r.claimStatuses,
          evidenceSummary: r.evidenceSummary,
          draftText: r.draftText,
          qaPassed: r.qaPassed,
          qaIssues: r.qaIssues,
          visualEligible: r.visualEligible,
          visualReason: r.visualReason,
          stages: r.stages,
          errors: r.errors,
        }
      : null,
  })

  const groq = await groqJsonCompletion({
    system,
    user,
    operation: "validation_machine_grade_v1",
  })
  if (!groq.ok) return { error: groq.reason }

  const j = groq.json as Record<string, unknown>
  const scoresRaw = (j.scores ?? {}) as Record<string, unknown>
  return {
    grade: asGrade(j.grade),
    scores: {
      truthfulness: clamp15(scoresRaw.truthfulness),
      usefulness: clamp15(scoresRaw.usefulness),
      framing: clamp15(scoresRaw.framing),
      brandVoice: clamp15(scoresRaw.brandVoice),
    },
    summary: typeof j.summary === "string" ? j.summary : "",
    strengths: Array.isArray(j.strengths) ? j.strengths.map(String).slice(0, 6) : [],
    failures: Array.isArray(j.failures) ? j.failures.map(String).slice(0, 6) : [],
    model: groq.model,
  }
}

export async function autoGradeValidationBatch(
  batchId: string,
  opts?: { limit?: number; onlyUngraded?: boolean; reviewOnly?: boolean },
): Promise<{
  graded: number
  errors: number
  reportMarkdown: string
  machineAbRatePercent: number | null
}> {
  const batch = await prisma.arieValidationBatch.findUnique({
    where: { id: batchId },
    include: {
      cases: { orderBy: [{ reviewPriority: "desc" }, { createdAt: "asc" }] },
    },
  })
  if (!batch) throw new Error("batch_not_found")
  if (batch.status === "CREATED" || batch.status === "RUNNING") {
    throw new Error("batch_not_ready_for_autograde")
  }

  let targets = batch.cases.filter((c) => c.pipelineResult || c.status === "pipeline_error")
  if (opts?.reviewOnly) targets = targets.filter((c) => c.selectedForReview)
  if (opts?.onlyUngraded) targets = targets.filter((c) => !c.machineEval)
  if (typeof opts?.limit === "number") targets = targets.slice(0, opts.limit)

  let graded = 0
  let errors = 0

  for (const c of targets) {
    const pr = c.pipelineResult as PipelineResultSnapshot | null
    const flags = deterministicMachineFlags({
      sourceText: c.sourceText,
      tags: c.tags,
      pipelineResult: pr,
      status: c.status,
    })

    try {
      const llm = await llmGradeCase({
        sourceHandle: c.sourceHandle,
        sourceText: c.sourceText,
        tags: c.tags,
        pipelineResult: pr,
        flags,
      })
      if ("error" in llm) {
        // Fallback deterministic-only grade when Groq unavailable
        const grade = applyDeterministicFloor(
          flags.includes("correctly_ineligible_or_no_draft") && !flags.includes("pipeline_error")
            ? "B"
            : "C",
          flags,
        )
        const evalRow: MachineEval = {
          grade,
          scores: { truthfulness: 3, usefulness: 3, framing: 3, brandVoice: 3 },
          summary: `Deterministic fallback (${llm.error}). Flags: ${flags.join(", ") || "none"}`,
          strengths: flags.includes("good_attribution_signal") ? ["attribution_signal"] : [],
          failures: flags.filter((f) => !f.startsWith("good_")),
          model: "deterministic-fallback",
          promptVersion: MACHINE_GRADE_PROMPT_VERSION,
          gradedAt: new Date().toISOString(),
          deterministicFlags: flags,
        }
        await prisma.arieValidationCase.update({
          where: { id: c.id },
          data: {
            machineEval: evalRow as unknown as Prisma.InputJsonValue,
            machineGradedAt: new Date(),
          },
        })
        graded++
        errors++
        continue
      }

      const grade = applyDeterministicFloor(llm.grade, flags)
      const evalRow: MachineEval = {
        ...llm,
        grade,
        promptVersion: MACHINE_GRADE_PROMPT_VERSION,
        gradedAt: new Date().toISOString(),
        deterministicFlags: flags,
      }
      await prisma.arieValidationCase.update({
        where: { id: c.id },
        data: {
          machineEval: evalRow as unknown as Prisma.InputJsonValue,
          machineGradedAt: new Date(),
        },
      })
      graded++
    } catch (e) {
      errors++
      await prisma.arieValidationCase.update({
        where: { id: c.id },
        data: {
          machineEval: {
            grade: "D",
            scores: { truthfulness: 1, usefulness: 1, framing: 1, brandVoice: 1 },
            summary: e instanceof Error ? e.message : String(e),
            strengths: [],
            failures: ["auto_grade_exception"],
            model: "error",
            promptVersion: MACHINE_GRADE_PROMPT_VERSION,
            gradedAt: new Date().toISOString(),
            deterministicFlags: flags,
          } satisfies MachineEval as unknown as Prisma.InputJsonValue,
          machineGradedAt: new Date(),
        },
      })
    }
  }

  const report = await buildValidationAnalyticsReport(batchId)

  const prev = (batch.aggregateMetrics as Record<string, unknown> | null) ?? {}
  await prisma.arieValidationBatch.update({
    where: { id: batchId },
    data: {
      aggregateMetrics: {
        ...prev,
        ...report.metricsBase,
        machineEvaluation: report.machineSummary,
        analyticsReportMarkdown: report.markdown,
        analyticsReportUpdatedAt: new Date().toISOString(),
      } as unknown as Prisma.InputJsonValue,
    },
  })

  return {
    graded,
    errors,
    reportMarkdown: report.markdown,
    machineAbRatePercent: report.machineSummary.abRatePercent,
  }
}

export async function buildValidationAnalyticsReport(batchId: string): Promise<{
  markdown: string
  json: Record<string, unknown>
  metricsBase: Record<string, unknown>
  machineSummary: {
    graded: number
    gradeCounts: Record<string, number>
    abRatePercent: number | null
    avgScores: Record<string, number | null>
    byHandle: Record<string, { n: number; ab: number; grades: Record<string, number> }>
  }
}> {
  const batch = await prisma.arieValidationBatch.findUnique({
    where: { id: batchId },
    include: { cases: { orderBy: [{ reviewPriority: "desc" }, { createdAt: "asc" }] } },
  })
  if (!batch) throw new Error("batch_not_found")

  const metricsBase = computeAggregateMetrics(
    batch.cases.map((c) => ({
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

  const machineRows = batch.cases
    .map((c) => ({
      c,
      m: c.machineEval as MachineEval | null,
    }))
    .filter((x): x is { c: (typeof batch.cases)[0]; m: MachineEval } => Boolean(x.m?.grade))

  const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
  for (const { m } of machineRows) {
    if (gradeCounts[m.grade] != null) gradeCounts[m.grade]++
  }
  const ab = gradeCounts.A + gradeCounts.B
  const abRatePercent = machineRows.length
    ? Math.round((ab / machineRows.length) * 1000) / 10
    : null

  const avg = (xs: number[]) =>
    xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null

  const byHandle: Record<string, { n: number; ab: number; grades: Record<string, number> }> = {}
  for (const { c, m } of machineRows) {
    const h = c.sourceHandle || "unknown"
    byHandle[h] ??= { n: 0, ab: 0, grades: { A: 0, B: 0, C: 0, D: 0 } }
    byHandle[h].n++
    byHandle[h].grades[m.grade] = (byHandle[h].grades[m.grade] ?? 0) + 1
    if (m.grade === "A" || m.grade === "B") byHandle[h].ab++
  }

  const machineSummary = {
    graded: machineRows.length,
    gradeCounts,
    abRatePercent,
    avgScores: {
      truthfulness: avg(machineRows.map((x) => x.m.scores.truthfulness)),
      usefulness: avg(machineRows.map((x) => x.m.scores.usefulness)),
      framing: avg(machineRows.map((x) => x.m.scores.framing)),
      brandVoice: avg(machineRows.map((x) => x.m.scores.brandVoice)),
    },
    byHandle,
  }

  const versions = (batch.arieVersions as Record<string, string> | null) ?? {}
  const lines: string[] = []
  lines.push(`# ARIE Validation Analytics`)
  lines.push(``)
  lines.push(`- **Batch:** ${batch.name} (\`${batch.id}\`)`)
  lines.push(`- **Status:** ${batch.status}`)
  lines.push(`- **Corpus:** ${batch.corpusVersion}`)
  lines.push(`- **Run mode:** ${batch.runMode}`)
  lines.push(`- **Created:** ${batch.createdAt.toISOString()}`)
  lines.push(
    `- **Versions:** builder ${versions.contextBuilder ?? "—"} · writer ${versions.writerPrompt ?? "—"} · QA ${versions.qaPrompt ?? "—"} · constitution ${versions.constitution ?? "—"}`,
  )
  lines.push(`- **Machine grade prompt:** ${MACHINE_GRADE_PROMPT_VERSION}`)
  lines.push(``)
  lines.push(`## Pipeline summary`)
  lines.push(``)
  lines.push(`| Metric | Value |`)
  lines.push(`| --- | --- |`)
  lines.push(`| Cases | ${metricsBase.totalCases} |`)
  lines.push(`| Pipeline done | ${metricsBase.pipelineDone} |`)
  lines.push(`| Pipeline errors | ${metricsBase.pipelineErrors} |`)
  lines.push(`| Eligible % | ${metricsBase.eligibleRatePercent ?? "—"} |`)
  lines.push(`| Avg opportunity | ${metricsBase.avgOpportunityScore ?? "—"} |`)
  lines.push(`| Avg factual confidence | ${metricsBase.avgFactualConfidence ?? "—"} |`)
  lines.push(`| Selected for human review | ${metricsBase.selectedForReview} |`)
  lines.push(`| Human graded | ${metricsBase.graded} |`)
  lines.push(`| Human A/B % | ${metricsBase.abRatePercent ?? "—"} |`)
  lines.push(``)
  lines.push(`## Machine grades (LLM + deterministic floor)`)
  lines.push(``)
  lines.push(`| Metric | Value |`)
  lines.push(`| --- | --- |`)
  lines.push(`| Machine graded | ${machineSummary.graded} |`)
  lines.push(
    `| Grade counts | A ${gradeCounts.A} · B ${gradeCounts.B} · C ${gradeCounts.C} · D ${gradeCounts.D} |`,
  )
  lines.push(`| Machine A/B % | ${machineSummary.abRatePercent ?? "—"} |`)
  lines.push(
    `| Avg scores | T ${machineSummary.avgScores.truthfulness ?? "—"} · U ${machineSummary.avgScores.usefulness ?? "—"} · F ${machineSummary.avgScores.framing ?? "—"} · V ${machineSummary.avgScores.brandVoice ?? "—"} |`,
  )
  lines.push(``)
  lines.push(`### By source`)
  lines.push(``)
  for (const [h, row] of Object.entries(byHandle).sort((a, b) => b[1].n - a[1].n)) {
    const abPct = row.n ? Math.round((row.ab / row.n) * 1000) / 10 : 0
    lines.push(
      `- @${h}: n=${row.n} · A/B ${abPct}% · A${row.grades.A}/B${row.grades.B}/C${row.grades.C}/D${row.grades.D}`,
    )
  }
  lines.push(``)
  lines.push(`## Cases`)
  lines.push(``)
  for (const c of batch.cases) {
    const pr = c.pipelineResult as PipelineResultSnapshot | null
    const m = c.machineEval as MachineEval | null
    lines.push(`### ${c.corpusItemId} · @${c.sourceHandle ?? "unknown"}`)
    lines.push(``)
    lines.push(`> ${c.sourceText.replace(/\n+/g, " ").slice(0, 280)}`)
    lines.push(``)
    lines.push(
      `- Opportunity: ${pr?.originalScore ?? "—"} · Eligible: ${pr?.eligible ?? "—"} · FC: ${pr?.factualConfidence ?? "—"} · Mode: ${pr?.writerMode ?? "—"}`,
    )
    lines.push(
      `- Reliability: ${pr?.sourceReliabilityClass ?? "—"} · Distribution: ${pr?.sourceDistributionPriority ?? "—"} · QA: ${pr?.qaPassed ?? "—"}`,
    )
    if (pr?.draftText) lines.push(`- Draft: ${pr.draftText.replace(/\n+/g, " ")}`)
    if (m) {
      lines.push(
        `- **Machine grade: ${m.grade}** (T${m.scores.truthfulness}/U${m.scores.usefulness}/F${m.scores.framing}/V${m.scores.brandVoice})`,
      )
      if (m.summary) lines.push(`- Summary: ${m.summary}`)
      if (m.failures?.length) lines.push(`- Failures: ${m.failures.join("; ")}`)
      if (m.deterministicFlags?.length) {
        lines.push(`- Flags: ${m.deterministicFlags.join(", ")}`)
      }
    } else {
      lines.push(`- Machine grade: —`)
    }
    if (c.humanGrade) lines.push(`- Human grade: ${c.humanGrade}`)
    lines.push(``)
  }

  const markdown = lines.join("\n")
  const json = {
    batchId: batch.id,
    name: batch.name,
    corpusVersion: batch.corpusVersion,
    status: batch.status,
    runMode: batch.runMode,
    createdAt: batch.createdAt.toISOString(),
    arieVersions: batch.arieVersions,
    pipelineMetrics: metricsBase,
    machineSummary,
    cases: batch.cases.map((c) => ({
      id: c.id,
      corpusItemId: c.corpusItemId,
      sourceHandle: c.sourceHandle,
      sourceText: c.sourceText,
      tags: c.tags,
      selectedForReview: c.selectedForReview,
      humanGrade: c.humanGrade,
      machineEval: c.machineEval,
      pipelineResult: c.pipelineResult,
    })),
  }

  return { markdown, json, metricsBase, machineSummary }
}
