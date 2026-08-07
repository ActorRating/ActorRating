export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { buildContextFromText } from "@/lib/arie/pipeline"
import { previewReplyDraft } from "@/lib/arie/preview-draft"
/** GET — next ungraded preview (or latest if ?id=). */
export async function GET(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = request.nextUrl.searchParams.get("id")
  if (id) {
    const row = await prisma.ariePreviewEval.findUnique({ where: { id } })
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ preview: serialize(row) })
  }

  const pending = await prisma.ariePreviewEval.findFirst({
    where: { humanGrade: null },
    orderBy: { createdAt: "asc" },
  })

  const counts = await prisma.ariePreviewEval.groupBy({
    by: ["humanGrade"],
    _count: { _all: true },
  })

  return NextResponse.json({
    preview: pending ? serialize(pending) : null,
    counts: Object.fromEntries(
      counts.map((c) => [c.humanGrade ?? "ungraded", c._count._all]),
    ),
    ungraded: await prisma.ariePreviewEval.count({ where: { humanGrade: null } }),
    total: await prisma.ariePreviewEval.count(),
  })
}

/** POST — create a new preview from tweet text (admin eval loop). */
export async function POST(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as null | {
    text?: string
    authorHandle?: string
  }
  if (!body?.text?.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 })
  }

  try {
    const pkg = await buildContextFromText({
      text: body.text,
      authorHandle: body.authorHandle ?? null,
    })

    // Admin VM1 eval must score the full distribution spectrum — including mid/low
    // Opportunity. Do not apply Cost Governor spend gates here (production ingest still does).
    if (pkg.opportunity.decision === "ignore") {
      return NextResponse.json(
        {
          error: "opportunity_ignored",
          opportunity: pkg.opportunity,
          coverage: pkg.coverage,
          package: pkg,
          hint: "System would not reply. For should-ignore corpus rows, note the handle + score and grade Opportunity correctness in notes; or paste a processable tweet.",
        },
        { status: 422 },
      )
    }

    const draft = await previewReplyDraft(pkg)
    if (!draft.ok) {
      return NextResponse.json(
        {
          error: draft.reason,
          coverage: pkg.coverage,
          opportunity: pkg.opportunity,
        },
        { status: 422 },
      )
    }

    const row = await prisma.ariePreviewEval.findUnique({ where: { id: draft.previewId } })
    return NextResponse.json({ preview: row ? serialize(row) : null })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[arie/admin/previews]", message)
    return NextResponse.json({ error: "preview_failed", reason: message }, { status: 500 })
  }
}

function serialize(row: {
  id: string
  sourceText: string
  authorHandle: string | null
  opportunityScore: number
  coveragePercent: number
  coverage: unknown
  contextPackage: unknown
  draftText: string
  draftJson: unknown
  confidence: number | null
  promptVersion: string
  model: string
  generationMs: number | null
  promptTokens: number | null
  completionTokens: number | null
  humanGrade: string | null
  scoreRelevance: number | null
  scoreInsight: number | null
  scoreAccuracy: number | null
  scoreBrandVoice: number | null
  notes: string | null
  gradedAt: Date | null
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
    draftJson: row.draftJson,
    confidence: row.confidence,
    promptVersion: row.promptVersion,
    model: row.model,
    generationMs: row.generationMs,
    promptTokens: row.promptTokens,
    completionTokens: row.completionTokens,
    humanGrade: row.humanGrade,
    scoreRelevance: row.scoreRelevance,
    scoreInsight: row.scoreInsight,
    scoreAccuracy: row.scoreAccuracy,
    scoreBrandVoice: row.scoreBrandVoice,
    notes: row.notes,
    gradedAt: row.gradedAt,
    createdAt: row.createdAt,
    contextPackage: row.contextPackage,
  }
}
