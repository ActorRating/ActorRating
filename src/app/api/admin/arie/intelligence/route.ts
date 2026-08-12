export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import {
  loadDailyIntelligence,
  markIntelligenceApproved,
  skipIntelligenceCandidate,
} from "@/lib/arie/intelligence"
import {
  generateConceptsForOpportunity,
  generateDraftForOpportunity,
  runQaForOpportunity,
} from "@/lib/arie/original-pipeline"
import { arieOriginalPublishEnabled, ariePublishEnabled } from "@/lib/arie/config"

/** GET — today's ranked intelligence candidates. */
export async function GET(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 5)
  const summary = await loadDailyIntelligence({ limit: Number.isFinite(limit) ? limit : 5 })

  return NextResponse.json({
    ...summary,
    publishFlags: {
      ARIE_PUBLISH_ENABLED: ariePublishEnabled(),
      ARIE_ORIGINAL_PUBLISH_ENABLED: arieOriginalPublishEnabled(),
    },
  })
}

/** POST — approve, skip, or run pipeline stage on a candidate. */
export async function POST(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const action = body.action as string
  const opportunityId = typeof body.opportunityId === "string" ? body.opportunityId : ""

  if (!opportunityId) {
    return NextResponse.json({ error: "opportunityId required" }, { status: 400 })
  }

  if (action === "skip") {
    const res = await skipIntelligenceCandidate(
      opportunityId,
      typeof body.reason === "string" ? body.reason : undefined,
    )
    if (!res.ok) return NextResponse.json({ error: res.reason }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (action === "approve") {
    const res = await markIntelligenceApproved({
      opportunityId,
      approvedByEmail: admin.email ?? null,
    })
    if (!res.ok) return NextResponse.json({ error: res.reason }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (action === "generate_concepts") {
    const res = await generateConceptsForOpportunity(opportunityId, { bypassGovernor: true })
    if (!res.ok) return NextResponse.json({ error: res.reason }, { status: 400 })
    return NextResponse.json({ ok: true, selected: res.selected })
  }

  if (action === "generate_draft") {
    const res = await generateDraftForOpportunity(opportunityId, { bypassGovernor: true })
    if (!res.ok) return NextResponse.json({ error: res.reason }, { status: 400 })
    return NextResponse.json({ ok: true, draft: res.draft.text })
  }

  if (action === "run_qa") {
    const res = await runQaForOpportunity(opportunityId, { bypassGovernor: true })
    if (!res.ok) return NextResponse.json({ error: res.reason, qa: res.qa }, { status: 400 })
    return NextResponse.json({ ok: true, qa: res.qa })
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 })
}
