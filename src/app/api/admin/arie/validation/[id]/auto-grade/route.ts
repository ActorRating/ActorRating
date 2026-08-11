export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { autoGradeValidationBatch } from "@/lib/arie/validation-auto-grade"

/**
 * POST — LLM machine-grade all (or N) cases. Never overwrites humanGrade / pipelineResult.
 * Works on already-processed batches (SAMPLED / GRADING / COMPLETE).
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const body = await request.json().catch(() => ({}))
  const limit =
    typeof body.limit === "number" && body.limit > 0
      ? Math.min(50, Math.floor(body.limit))
      : undefined

  try {
    const result = await autoGradeValidationBatch(id, {
      limit,
      onlyUngraded: body.onlyUngraded === true,
      reviewOnly: body.reviewOnly === true,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const status =
      msg === "batch_not_found" ? 404 : msg === "batch_not_ready_for_autograde" ? 409 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
