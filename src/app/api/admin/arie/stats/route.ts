export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"

/** GET — validation dashboard stats for Batch analysis. */
export async function GET() {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [byGrade, bySourceGrade, byDraftKind, recent, totals] = await Promise.all([
    prisma.ariePreviewEval.groupBy({
      by: ["humanGrade"],
      _count: { _all: true },
    }),
    prisma.ariePreviewEval.groupBy({
      by: ["authorHandle", "humanGrade"],
      where: { humanGrade: { not: null } },
      _count: { _all: true },
    }),
    prisma.ariePreviewEval.groupBy({
      by: ["draftText"],
      where: {
        humanGrade: { not: null },
        OR: [
          { draftText: "[NO REPLY]" },
          { draftText: "[IGNORED BY OPPORTUNITY]" },
        ],
      },
      _count: { _all: true },
    }),
    prisma.ariePreviewEval.findMany({
      where: { humanGrade: { not: null } },
      orderBy: [{ gradedAt: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: {
        id: true,
        authorHandle: true,
        humanGrade: true,
        opportunityScore: true,
        coveragePercent: true,
        draftText: true,
        promptVersion: true,
        notes: true,
        scoreRelevance: true,
        scoreInsight: true,
        scoreAccuracy: true,
        scoreBrandVoice: true,
        sourceText: true,
        gradedAt: true,
      },
    }),
    prisma.ariePreviewEval.aggregate({
      where: { humanGrade: { not: null } },
      _avg: { opportunityScore: true, coveragePercent: true },
      _count: { _all: true },
    }),
  ])

  const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, ungraded: 0 }
  for (const row of byGrade) {
    gradeCounts[row.humanGrade ?? "ungraded"] = row._count._all
  }
  const graded =
    (gradeCounts.A ?? 0) + (gradeCounts.B ?? 0) + (gradeCounts.C ?? 0) + (gradeCounts.D ?? 0)
  const ab = (gradeCounts.A ?? 0) + (gradeCounts.B ?? 0)

  return NextResponse.json({
    graded,
    abRate: graded ? ab / graded : 0,
    dRate: graded ? (gradeCounts.D ?? 0) / graded : 0,
    gradeCounts,
    avgOpportunity: totals._avg.opportunityScore,
    avgCoverage: totals._avg.coveragePercent,
    silenceCounts: Object.fromEntries(
      byDraftKind.map((r) => [r.draftText, r._count._all]),
    ),
    bySource: bySourceGrade.map((r) => ({
      authorHandle: r.authorHandle,
      humanGrade: r.humanGrade,
      n: r._count._all,
    })),
    recent: recent.map((r) => ({
      ...r,
      draftPreview: r.draftText.slice(0, 160),
      sourcePreview: r.sourceText.slice(0, 120),
      draftText: undefined,
      sourceText: undefined,
    })),
  })
}
