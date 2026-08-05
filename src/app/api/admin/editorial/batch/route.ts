export const dynamic = "force-dynamic"
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { generatePerformanceEditorial } from "@/lib/editorial/generate-performance-editorial"
import { listEditorialGenerationQueue } from "@/lib/editorial/editorial-queue"

/**
 * POST { limit?: number, minRatings?: number }
 * Server-side batch (kept small). Prefer client one-by-one via /generate for reliability.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      limit?: number
      minRatings?: number
    }
    const limit = Math.min(Math.max(Number(body.limit) || 5, 1), 15)
    const minRatings = Math.max(Number(body.minRatings) ?? 0, 0)

    const queue = await listEditorialGenerationQueue(prisma, { limit, minRatings })
    if (queue.length === 0) {
      return NextResponse.json({
        attempted: 0,
        ok: 0,
        fail: 0,
        results: [],
        message: "Queue empty — no indexable performances missing editorial.",
      })
    }

    const results: Array<{ label: string; ok: boolean; detail: string }> = []
    let ok = 0
    let fail = 0

    for (const item of queue) {
      const label = `${item.actorName} / ${item.movieTitle}`
      try {
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
      } catch (err) {
        fail += 1
        results.push({
          label,
          ok: false,
          detail: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return NextResponse.json({ attempted: queue.length, ok, fail, results })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const missingTable =
      msg.includes("PerformanceEditorial") ||
      msg.includes("does not exist") ||
      msg.includes("P2021")
    return NextResponse.json(
      {
        error: missingTable
          ? "PerformanceEditorial table missing — run prisma migrate deploy on the server."
          : msg,
      },
      { status: missingTable ? 503 : 500 },
    )
  }
}
