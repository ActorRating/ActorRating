export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { runValidationBatch } from "@/lib/arie/validation-batch"

/** POST — run existing originals pipeline for pending cases (no publish). */
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
    const result = await runValidationBatch(id, { limit })
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const status =
      msg === "batch_not_found"
        ? 404
        : msg === "batch_pipeline_frozen" || msg === "batch_immutable_complete"
          ? 409
          : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
