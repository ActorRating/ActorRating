export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { arieServiceKey } from "@/lib/arie/config"
import { buildContextFromText } from "@/lib/arie/pipeline"
import { previewReplyDraft } from "@/lib/arie/preview-draft"
import { getGovernorSnapshot, governorAllowsOpportunity } from "@/lib/arie/cost-governor"

function authorized(request: NextRequest): boolean {
  const expected = arieServiceKey()
  if (!expected) return false
  const header = request.headers.get("authorization") ?? ""
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  const alt = request.headers.get("x-arie-key")?.trim() ?? ""
  return bearer === expected || alt === expected
}

/**
 * POST /api/arie/preview-draft
 * Milestone validator: news text → Context Package → Groq draft (never publishes).
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as null | {
    text?: string
    authorHandle?: string
  }
  if (!body?.text?.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 })
  }

  const pkg = await buildContextFromText({
    text: body.text,
    authorHandle: body.authorHandle ?? "deadline",
  })

  const snap = await getGovernorSnapshot()
  const gate = governorAllowsOpportunity(snap, {
    opportunityScore: pkg.opportunity.score,
    priorityAuthor: pkg.opportunity.priorityAuthor,
  })
  if (!gate.allowed) {
    return NextResponse.json(
      {
        error: "blocked_by_cost_governor",
        reason: gate.reason,
        opportunity: pkg.opportunity,
        package: pkg,
      },
      { status: 402 },
    )
  }

  const draft = await previewReplyDraft(pkg)
  if (!draft.ok) {
    return NextResponse.json(
      { error: draft.reason, opportunity: pkg.opportunity, package: pkg },
      { status: 422 },
    )
  }

  return NextResponse.json({
    opportunityScore: draft.opportunityScore,
    confidence: draft.draft.confidence,
    draft: draft.draft,
    package: pkg,
  })
}
