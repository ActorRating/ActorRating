export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { listEditorialGenerationQueue } from "@/lib/editorial/editorial-queue"

/** GET ?limit=20&minRatings=0 — preview generation queue for admin. */
export async function GET(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? "20") || 20, 1), 50)
    const minRatings = Math.max(Number(request.nextUrl.searchParams.get("minRatings") ?? "0") || 0, 0)
    const items = await listEditorialGenerationQueue(prisma, { limit, minRatings })
    return NextResponse.json({ items, count: items.length })
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
