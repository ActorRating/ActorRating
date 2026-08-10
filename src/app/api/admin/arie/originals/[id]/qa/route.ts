export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { runQaForOpportunity } from "@/lib/arie/original-pipeline"

type Ctx = { params: Promise<{ id: string }> }

/** POST — deterministic + semantic QA. */
export async function POST(_request: NextRequest, ctx: Ctx) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const result = await runQaForOpportunity(id, { bypassGovernor: true })
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason, qa: result.qa ?? null },
      { status: 422 },
    )
  }
  return NextResponse.json({ ok: true, qa: result.qa })
}
