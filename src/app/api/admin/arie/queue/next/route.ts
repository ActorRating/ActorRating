export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { buildContextFromText } from "@/lib/arie/pipeline"
import { previewReplyDraft, NO_REPLY_TEXT } from "@/lib/arie/preview-draft"
import { loadEvalQueue, queueStats, saveEvalQueue } from "@/lib/arie/eval-queue"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

/**
 * POST — generate draft for next pending queue item and mark it done.
 * Also persists Opportunity ignores as gradeable rows ([IGNORED BY OPPORTUNITY]).
 */
export async function POST() {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const state = await loadEvalQueue()
  const idx = state.items.findIndex((i) => i.status === "pending")
  if (idx < 0) {
    return NextResponse.json({ error: "queue_empty", ...queueStats(state.items) }, { status: 404 })
  }

  const item = state.items[idx]

  try {
    const pkg = await buildContextFromText({
      text: item.text,
      authorHandle: item.authorHandle,
    })

    if (pkg.opportunity.decision === "ignore") {
      const row = await prisma.ariePreviewEval.create({
        data: {
          sourceText: pkg.event.text,
          authorHandle: pkg.event.author_handle ?? item.authorHandle,
          opportunityScore: pkg.opportunity.score,
          coveragePercent: pkg.coverage.percent,
          coverage: pkg.coverage as unknown as Prisma.InputJsonValue,
          contextPackage: pkg as unknown as Prisma.InputJsonValue,
          draftText: "[IGNORED BY OPPORTUNITY]",
          draftJson: {
            action: "ignore",
            reason: pkg.opportunity.reasonCodes.join(","),
            reply: "[IGNORED BY OPPORTUNITY]",
          } as unknown as Prisma.InputJsonValue,
          confidence: 0,
          promptVersion: "opportunity@ignore",
          model: "none",
          generationMs: 0,
        },
      })
      state.items[idx] = {
        ...item,
        status: "done",
        previewId: row.id,
      }
      await saveEvalQueue(state)
      return NextResponse.json({
        preview: serialize(row),
        queue: queueStats(state.items),
        kind: "ignored",
      })
    }

    const draft = await previewReplyDraft(pkg)
    if (!draft.ok) {
      state.items[idx] = { ...item, status: "error", error: draft.reason }
      await saveEvalQueue(state)
      return NextResponse.json(
        { error: draft.reason, queue: queueStats(state.items) },
        { status: 422 },
      )
    }

    const row = await prisma.ariePreviewEval.findUnique({ where: { id: draft.previewId } })
    state.items[idx] = { ...item, status: "done", previewId: draft.previewId }
    await saveEvalQueue(state)

    return NextResponse.json({
      preview: row ? serialize(row) : null,
      queue: queueStats(state.items),
      kind: draft.draft.action === "no_reply" || draft.draft.reply === NO_REPLY_TEXT ? "no_reply" : "reply",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    state.items[idx] = { ...item, status: "error", error: message }
    await saveEvalQueue(state)
    return NextResponse.json(
      { error: "queue_next_failed", reason: message, queue: queueStats(state.items) },
      { status: 500 },
    )
  }
}

function serialize(row: {
  id: string
  sourceText: string
  authorHandle: string | null
  opportunityScore: number
  coveragePercent: number
  coverage: unknown
  draftText: string
  confidence: number | null
  promptVersion: string
  model: string
  generationMs: number | null
  humanGrade: string | null
  scoreRelevance: number | null
  scoreInsight: number | null
  scoreAccuracy: number | null
  scoreBrandVoice: number | null
  notes: string | null
  createdAt: Date
}) {
  return {
    id: row.id,
    sourceText: row.sourceText,
    authorHandle: row.authorHandle,
    opportunityScore: row.opportunityScore,
    coveragePercent: row.coveragePercent,
    coverage: row.coverage,
    draftText: row.draftText,
    confidence: row.confidence,
    promptVersion: row.promptVersion,
    model: row.model,
    generationMs: row.generationMs,
    humanGrade: row.humanGrade,
    scoreRelevance: row.scoreRelevance,
    scoreInsight: row.scoreInsight,
    scoreAccuracy: row.scoreAccuracy,
    scoreBrandVoice: row.scoreBrandVoice,
    notes: row.notes,
    createdAt: row.createdAt,
  }
}
