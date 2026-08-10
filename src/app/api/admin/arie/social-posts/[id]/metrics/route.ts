export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import {
  METRIC_WINDOWS,
  recordMetricSnapshot,
  type MetricWindow,
} from "@/lib/arie/original-metrics"

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST — record a metric snapshot for a published original social post.
 * Body: { window: "1h"|"6h"|"24h"|"72h"|"7d", metrics: { impressions?: number|null, ... } }
 * Does not invent values; null/omit = leave unset.
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: socialPostId } = await ctx.params

  const body = (await request.json().catch(() => null)) as null | {
    window?: string
    metrics?: Record<string, number | null>
  }
  if (!body?.window || !(METRIC_WINDOWS as readonly string[]).includes(body.window)) {
    return NextResponse.json(
      { error: `window required: ${METRIC_WINDOWS.join("|")}` },
      { status: 400 },
    )
  }

  const result = await recordMetricSnapshot({
    socialPostId,
    window: body.window as MetricWindow,
    metrics: body.metrics ?? {},
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 422 })
  }
  return NextResponse.json({ ok: true })
}
