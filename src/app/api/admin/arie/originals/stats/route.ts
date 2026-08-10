export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { expireStaleOriginals } from "@/lib/arie/original-pipeline"

/** GET — lightweight funnel metrics for originals admin. */
export async function GET() {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await expireStaleOriginals()

  const byStatus = await prisma.arieOpportunity.groupBy({
    by: ["originalStatus"],
    where: { contentType: "original" },
    _count: { _all: true },
    _avg: { originalScore: true },
  })

  const statusMap = Object.fromEntries(
    byStatus.map((s) => [s.originalStatus ?? "null", s._count._all]),
  )

  const rows = await prisma.arieOpportunity.findMany({
    where: { contentType: "original" },
    select: {
      concepts: true,
      finalDraft: true,
      qaResult: true,
      originalScore: true,
      selectedConcept: true,
    },
  })

  let conceptsGenerated = 0
  let draftsGenerated = 0
  let qaPassed = 0
  let qaFailed = 0
  let conceptScoreSum = 0
  let conceptScoreN = 0
  let qaConfSum = 0
  let qaConfN = 0
  let scoreSum = 0
  let scoreN = 0

  for (const row of rows) {
    if (row.concepts != null) conceptsGenerated++
    if (row.finalDraft) draftsGenerated++
    if (typeof row.originalScore === "number") {
      scoreSum += row.originalScore
      scoreN++
    }
    const qa = row.qaResult as { passed?: boolean; semantic?: { confidence?: number } } | null
    if (qa?.passed === true) qaPassed++
    if (qa && qa.passed === false) qaFailed++
    const sel = row.selectedConcept as { totalScore?: number } | null
    if (typeof sel?.totalScore === "number") {
      conceptScoreSum += sel.totalScore
      conceptScoreN++
    }
    if (typeof qa?.semantic?.confidence === "number") {
      qaConfSum += qa.semantic.confidence
      qaConfN++
    }
  }

  return NextResponse.json({
    total: rows.length,
    byStatus: statusMap,
    eligible: statusMap.ELIGIBLE ?? 0,
    ignored: (statusMap.IGNORED ?? 0) + (statusMap.REJECTED ?? 0),
    expired: statusMap.EXPIRED ?? 0,
    conceptsGenerated,
    draftsGenerated,
    qaPassed,
    qaFailed,
    ready: (statusMap.READY ?? 0) + (statusMap.APPROVED ?? 0),
    approved: statusMap.APPROVED ?? 0,
    published: statusMap.PUBLISHED ?? 0,
    averageOpportunityScore: scoreN ? Math.round(scoreSum / scoreN) : 0,
    averageConceptScore: conceptScoreN ? Math.round(conceptScoreSum / conceptScoreN) : null,
    averageQaConfidence: qaConfN ? Math.round(qaConfSum / qaConfN) : null,
  })
}
