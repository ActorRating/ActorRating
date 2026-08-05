export const dynamic = "force-dynamic"
export const maxDuration = 300

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { generatePerformanceEditorial } from "@/lib/editorial/generate-performance-editorial"
import { listEditorialGenerationQueue } from "@/lib/editorial/editorial-queue"

/**
 * POST { limit?: number } — generate next N missing/NEEDS_REGEN editorials (admin-only).
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { limit?: number }
  const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 50)
  const queue = await listEditorialGenerationQueue(prisma, { limit, minRatings: 1 })

  const results: Array<{ label: string; ok: boolean; detail: string }> = []
  let ok = 0
  let fail = 0

  for (const item of queue) {
    const label = `${item.actorName} / ${item.movieTitle}`
    const result = await generatePerformanceEditorial(prisma, item.actorId, item.movieId, {
      publish: true,
      editedByEmail: admin.email,
    })
    if (result.ok) {
      ok += 1
      results.push({ label, ok: true, detail: `${result.status} ${result.wordCount}w` })
    } else {
      fail += 1
      results.push({ label, ok: false, detail: result.reason })
    }
  }

  return NextResponse.json({ attempted: queue.length, ok, fail, results })
}
