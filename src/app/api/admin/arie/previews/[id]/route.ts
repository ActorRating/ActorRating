export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import type { ArieHumanGrade } from "@prisma/client"

const GRADES = new Set(["A", "B", "C", "D"])

function clampScore(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null
  const v = Math.round(n)
  if (v < 1 || v > 5) return null
  return v
}

/** PATCH — save human grade + 1–5 subscores + optional notes. */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const body = (await request.json().catch(() => null)) as null | {
    humanGrade?: string
    notes?: string | null
    scoreRelevance?: number
    scoreInsight?: number
    scoreAccuracy?: number
    scoreBrandVoice?: number
  }
  if (!body?.humanGrade || !GRADES.has(body.humanGrade)) {
    return NextResponse.json({ error: "humanGrade must be A|B|C|D" }, { status: 400 })
  }

  const existing = await prisma.ariePreviewEval.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.ariePreviewEval.update({
    where: { id },
    data: {
      humanGrade: body.humanGrade as ArieHumanGrade,
      notes: body.notes?.trim() ? body.notes.trim() : null,
      scoreRelevance: clampScore(body.scoreRelevance),
      scoreInsight: clampScore(body.scoreInsight),
      scoreAccuracy: clampScore(body.scoreAccuracy),
      scoreBrandVoice: clampScore(body.scoreBrandVoice),
      gradedAt: new Date(),
      gradedByEmail: admin.email ?? null,
    },
  })

  return NextResponse.json({
    preview: {
      id: updated.id,
      humanGrade: updated.humanGrade,
      scoreRelevance: updated.scoreRelevance,
      scoreInsight: updated.scoreInsight,
      scoreAccuracy: updated.scoreAccuracy,
      scoreBrandVoice: updated.scoreBrandVoice,
      notes: updated.notes,
      gradedAt: updated.gradedAt,
      opportunityScore: updated.opportunityScore,
      coveragePercent: updated.coveragePercent,
      promptVersion: updated.promptVersion,
      model: updated.model,
    },
  })
}
