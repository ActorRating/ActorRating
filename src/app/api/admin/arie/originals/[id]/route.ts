export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import {
  approveOriginalOpportunity,
  selectConceptForOpportunity,
  setOriginalStatus,
} from "@/lib/arie/original-pipeline"

type Ctx = { params: Promise<{ id: string }> }

/** GET one opportunity with context package. */
export async function GET(_request: NextRequest, ctx: Ctx) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const row = await prisma.arieOpportunity.findFirst({
    where: { id, contentType: "original" },
    include: { inboundEvent: true, contextPackage: true },
  })
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    opportunity: {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString() ?? null,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      approvedAt: row.approvedAt?.toISOString() ?? null,
      event: row.inboundEvent,
      context: row.contextPackage?.package ?? null,
      builderVersion: row.contextPackage?.builderVersion ?? null,
    },
  })
}

/** PATCH — edit draft / status actions (ignore, reject, expire, approve, select concept). */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const body = (await request.json().catch(() => null)) as null | {
    action?: string
    finalDraft?: string
    reason?: string
    conceptId?: string
  }
  if (!body?.action) {
    return NextResponse.json({ error: "action required" }, { status: 400 })
  }

  if (body.action === "edit_draft") {
    if (typeof body.finalDraft !== "string") {
      return NextResponse.json({ error: "finalDraft required" }, { status: 400 })
    }
    const text = body.finalDraft.trim()
    if (text.length > 280) {
      return NextResponse.json({ error: "over_280" }, { status: 400 })
    }
    const row = await prisma.arieOpportunity.update({
      where: { id },
      data: {
        finalDraft: text,
        originalStatus: "DRAFT_GENERATED",
      },
    })
    return NextResponse.json({ ok: true, originalStatus: row.originalStatus })
  }

  if (body.action === "ignore") {
    const res = await setOriginalStatus(id, "IGNORED", body.reason ?? "human_ignore")
    if (!res.ok) return NextResponse.json({ error: res.reason }, { status: 422 })
    return NextResponse.json({ ok: true })
  }
  if (body.action === "reject") {
    const res = await setOriginalStatus(id, "REJECTED", body.reason ?? "human_reject")
    if (!res.ok) return NextResponse.json({ error: res.reason }, { status: 422 })
    return NextResponse.json({ ok: true })
  }
  if (body.action === "expire") {
    const res = await setOriginalStatus(id, "EXPIRED", body.reason ?? "human_expire")
    if (!res.ok) return NextResponse.json({ error: res.reason }, { status: 422 })
    return NextResponse.json({ ok: true })
  }
  if (body.action === "approve") {
    const res = await approveOriginalOpportunity({
      opportunityId: id,
      email: admin.email,
      editedDraft: body.finalDraft,
    })
    if (!res.ok) return NextResponse.json({ error: res.reason }, { status: 422 })
    return NextResponse.json({ ok: true })
  }
  if (body.action === "select_concept") {
    if (!body.conceptId) {
      return NextResponse.json({ error: "conceptId required" }, { status: 400 })
    }
    const res = await selectConceptForOpportunity(id, body.conceptId)
    if (!res.ok) return NextResponse.json({ error: res.reason }, { status: 422 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 })
}
