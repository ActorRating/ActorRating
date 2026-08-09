export const dynamic = "force-dynamic"
export const maxDuration = 120

import { NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { buildContextFromText } from "@/lib/arie/pipeline"
import { previewReplyDraft, NO_REPLY_TEXT } from "@/lib/arie/preview-draft"
import { loadEvalQueue, queueStats, saveEvalQueue, type EvalQueueItem } from "@/lib/arie/eval-queue"
import { maybeAutoPublishPreview } from "@/lib/arie/publisher"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

async function finalizeQueueItem(
  itemId: string,
  update: Partial<EvalQueueItem>,
): Promise<EvalQueueItem[]> {
  const latest = await loadEvalQueue()
  const i = latest.items.findIndex((x) => x.id === itemId)
  if (i < 0) return latest.items
  if (latest.items[i]!.status !== "in_progress" && update.status !== "error") {
    return latest.items
  }
  latest.items[i] = { ...latest.items[i]!, ...update }
  await saveEvalQueue(latest)
  return latest.items
}

/**
 * POST — generate draft for next pending queue item and mark it done.
 * Also persists Opportunity ignores as gradeable rows ([IGNORED BY OPPORTUNITY]).
 * Soft-launch: may auto-publish when flags + tweet id + opportunity clear.
 */
export async function POST() {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const state = await loadEvalQueue()
  const idx = state.items.findIndex((i) => i.status === "pending")
  if (idx < 0) {
    return NextResponse.json({ error: "queue_empty", queue: queueStats(state.items) }, { status: 404 })
  }

  const item = state.items[idx]!
  state.items[idx] = { ...item, status: "in_progress" }
  await saveEvalQueue(state)

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
          inReplyToTweetId: item.tweetId ?? null,
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
          publishStatus: "SKIPPED",
        },
      })
      const items = await finalizeQueueItem(item.id, { status: "done", previewId: row.id })
      return NextResponse.json({
        preview: serialize(row),
        queue: queueStats(items),
        kind: "ignored",
      })
    }

    const draft = await previewReplyDraft(pkg, { inReplyToTweetId: item.tweetId })
    if (!draft.ok) {
      const items = await finalizeQueueItem(item.id, { status: "error", error: draft.reason })
      return NextResponse.json({ error: draft.reason, queue: queueStats(items) }, { status: 422 })
    }

    const auto = await maybeAutoPublishPreview(draft.previewId)
    const row = await prisma.ariePreviewEval.findUnique({ where: { id: draft.previewId } })
    const items = await finalizeQueueItem(item.id, { status: "done", previewId: draft.previewId })

    return NextResponse.json({
      preview: row ? serialize(row) : null,
      queue: queueStats(items),
      kind: draft.draft.action === "no_reply" || draft.draft.reply === NO_REPLY_TEXT ? "no_reply" : "reply",
      publish: auto,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const items = await finalizeQueueItem(item.id, { status: "error", error: message })
    return NextResponse.json(
      { error: "queue_next_failed", reason: message, queue: queueStats(items) },
      { status: 500 },
    )
  }
}

function serialize(row: {
  id: string
  sourceText: string
  authorHandle: string | null
  inReplyToTweetId?: string | null
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
  publishStatus?: string | null
  publishMode?: string | null
  publishedTweetId?: string | null
  publishedAt?: Date | null
  publishError?: string | null
  createdAt: Date
}) {
  return {
    id: row.id,
    sourceText: row.sourceText,
    authorHandle: row.authorHandle,
    inReplyToTweetId: row.inReplyToTweetId ?? null,
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
    publishStatus: row.publishStatus ?? "DRAFT",
    publishMode: row.publishMode ?? null,
    publishedTweetId: row.publishedTweetId ?? null,
    publishedAt: row.publishedAt ?? null,
    publishError: row.publishError ?? null,
    createdAt: row.createdAt,
  }
}
