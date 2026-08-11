export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { gradeValidationCase } from "@/lib/arie/validation-batch"

/** POST — grade a sampled validation case (does not mutate corpus/pipeline snapshot). */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ caseId: string }> },
) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { caseId } = await ctx.params
  const body = await request.json().catch(() => ({}))
  const grade = body.humanGrade
  if (!["A", "B", "C", "D"].includes(grade)) {
    return NextResponse.json({ error: "humanGrade must be A|B|C|D" }, { status: 400 })
  }

  const result = await gradeValidationCase({
    caseId,
    humanGrade: grade,
    scoreTruthfulness: body.scoreTruthfulness,
    scoreUsefulness: body.scoreUsefulness,
    scoreFraming: body.scoreFraming,
    scoreBrandVoice: body.scoreBrandVoice,
    gradeNotes: typeof body.gradeNotes === "string" ? body.gradeNotes : undefined,
    gradedByEmail: admin.email ?? null,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
