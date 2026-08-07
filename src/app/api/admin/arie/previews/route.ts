export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { buildContextFromText } from "@/lib/arie/pipeline"
import { previewReplyDraft } from "@/lib/arie/preview-draft"
import { getGovernorSnapshot, governorAllowsOpportunity } from "@/lib/arie/cost-governor"

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

  const pkg = await buildContextFromText({
    text: body.text,
    authorHandle: body.authorHandle ?? null,
  })

  if (pkg.opportunity.decision === "ignore") {
    return NextResponse.json(
      {
        error: "opportunity_ignored",
        opportunity: pkg.opportunity,
        coverage: pkg.coverage,
        package: pkg,
      },
      { status: 422 },
    )
  }

  const snap = await getGovernorSnapshot()
  const gate = governorAllowsOpportunity(snap, {
    opportunityScore: pkg.opportunity.score,
    priorityAuthor: pkg.opportunity.priorityAuthor,
  })
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "blocked_by_cost_governor", reason: gate.reason, coverage: pkg.coverage },
      { status: 402 },
    )
  }

  const draft = await previewReplyDraft(pkg)
  if (!draft.ok) {
    return NextResponse.json({ error: draft.reason, coverage: pkg.coverage }, { status: 422 })
  }

  const row = await prisma.ariePreviewEval.findUnique({ where: { id: draft.previewId } })
  return NextResponse.json({ preview: row ? serialize(row) : null })
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
