export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { searchRatedPerformances } from "@/lib/admin/radar-card-data"

export async function GET(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() || ""
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50") || 50
    const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0") || 0

    const result = await searchRatedPerformances(prisma, { q, limit, offset })
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
