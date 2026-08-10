export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { generateConceptsForOpportunity } from "@/lib/arie/original-pipeline"

type Ctx = { params: Promise<{ id: string }> }

/** POST — generate / regenerate up to 3 concepts. */
export async function POST(_request: NextRequest, ctx: Ctx) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const result = await generateConceptsForOpportunity(id, { bypassGovernor: true })
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 422 })
  }
  return NextResponse.json({
    ok: true,
    concepts: result.concepts,
    selected: result.selected,
    explanation: result.explanation,
  })
}
