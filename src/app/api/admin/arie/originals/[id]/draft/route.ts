export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { generateDraftForOpportunity } from "@/lib/arie/original-pipeline"

type Ctx = { params: Promise<{ id: string }> }

/** POST — generate final draft + visual spec from selected concept. */
export async function POST(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const body = (await request.json().catch(() => null)) as null | { conceptId?: string }

  const result = await generateDraftForOpportunity(id, {
    bypassGovernor: true,
    conceptId: body?.conceptId,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 422 })
  }
  return NextResponse.json({
    ok: true,
    draft: result.draft,
    visual: result.visual,
  })
}
