export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { approveOriginalOpportunity } from "@/lib/arie/original-pipeline"
import { publishOriginalOpportunity } from "@/lib/arie/publisher"

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST — approve and/or publish an original.
 * Body: { publish?: boolean, finalDraft?: string }
 * Publishing requires prior/immediate approval + feature flags.
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const body = (await request.json().catch(() => null)) as null | {
    publish?: boolean
    finalDraft?: string
    approveOnly?: boolean
  }

  const approved = await approveOriginalOpportunity({
    opportunityId: id,
    email: admin.email,
    editedDraft: body?.finalDraft,
  })
  if (!approved.ok) {
    return NextResponse.json({ error: approved.reason }, { status: 422 })
  }

  if (body?.approveOnly || body?.publish === false) {
    return NextResponse.json({ ok: true, approved: true, published: false })
  }

  if (!body?.publish) {
    return NextResponse.json({ ok: true, approved: true, published: false })
  }

  const published = await publishOriginalOpportunity({
    opportunityId: id,
    mode: "MANUAL",
    textOverride: body.finalDraft,
  })
  if (!published.ok) {
    return NextResponse.json(
      {
        ok: false,
        approved: true,
        published: false,
        error: published.reason,
        xBody: published.xBody,
      },
      { status: 422 },
    )
  }

  return NextResponse.json({
    ok: true,
    approved: true,
    published: true,
    tweetId: published.tweetId,
  })
}
