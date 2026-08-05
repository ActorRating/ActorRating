export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import type { EditorialStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { countWords } from "@/lib/editorial/performance-editorial-validate"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, ctx: Ctx) {
  const admin = await requireAdminSession()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params
  const row = await prisma.performanceEditorial.findUnique({
    where: { id },
    include: {
      actor: { select: { id: true, name: true, slug: true } },
      movie: { select: { id: true, title: true, year: true, slug: true } },
    },
  })
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(row)
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdminSession()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params
  const body = (await request.json().catch(() => null)) as null | {
    overview?: string
    scoreAnalysis?: string
    communityTake?: string
    notableMoments?: string
    status?: EditorialStatus
    spoilerFree?: boolean
  }
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const existing = await prisma.performanceEditorial.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const overview = body.overview ?? existing.overview
  const scoreAnalysis = body.scoreAnalysis ?? existing.scoreAnalysis
  const communityTake = body.communityTake ?? existing.communityTake
  const notableMoments = body.notableMoments ?? existing.notableMoments
  const wordCount = countWords(overview, scoreAnalysis, communityTake, notableMoments)

  let status = body.status ?? existing.status
  if (
    status !== "DRAFT" &&
    status !== "PUBLISHED" &&
    status !== "HUMAN_LOCKED" &&
    status !== "NEEDS_REGEN"
  ) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const now = new Date()
  const row = await prisma.performanceEditorial.update({
    where: { id },
    data: {
      overview,
      scoreAnalysis,
      communityTake,
      notableMoments,
      spoilerFree: body.spoilerFree ?? existing.spoilerFree,
      status,
      wordCount,
      editedAt: now,
      editedByEmail: admin.email,
      publishedAt:
        status === "PUBLISHED" || status === "HUMAN_LOCKED"
          ? existing.publishedAt ?? now
          : null,
    },
    include: {
      actor: { select: { id: true, name: true, slug: true } },
      movie: { select: { id: true, title: true, year: true, slug: true } },
    },
  })

  return NextResponse.json(row)
}
