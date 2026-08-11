export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { buildValidationAnalyticsReport } from "@/lib/arie/validation-auto-grade"

/**
 * GET — analytics report for a batch (markdown + json). Works on any processed batch.
 * ?format=markdown|json  (default json with both fields)
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const format = request.nextUrl.searchParams.get("format") || "json"

  try {
    const report = await buildValidationAnalyticsReport(id)

    // Persist latest markdown onto aggregateMetrics without touching pipeline results
    const batch = await prisma.arieValidationBatch.findUnique({ where: { id } })
    if (batch) {
      const prev = (batch.aggregateMetrics as Record<string, unknown> | null) ?? {}
      await prisma.arieValidationBatch.update({
        where: { id },
        data: {
          aggregateMetrics: {
            ...prev,
            ...report.metricsBase,
            machineEvaluation: report.machineSummary,
            analyticsReportMarkdown: report.markdown,
            analyticsReportUpdatedAt: new Date().toISOString(),
          } as import("@prisma/client").Prisma.InputJsonValue,
        },
      })
    }

    if (format === "markdown" || format === "md") {
      return new NextResponse(report.markdown, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `inline; filename="arie-validation-${id}.md"`,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      markdown: report.markdown,
      report: report.json,
      machineSummary: report.machineSummary,
      pipelineMetrics: report.metricsBase,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: msg === "batch_not_found" ? 404 : 400 })
  }
}
