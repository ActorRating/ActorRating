export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import {
  getRadarCardPayload,
  listRatingsForPerformance,
} from "@/lib/admin/radar-card-data"

export async function GET(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const actorId = request.nextUrl.searchParams.get("actorId")?.trim()
  const movieId = request.nextUrl.searchParams.get("movieId")?.trim()
  const ratingId = request.nextUrl.searchParams.get("ratingId")?.trim() || null

  if (!actorId || !movieId) {
    return NextResponse.json({ error: "actorId and movieId are required" }, { status: 400 })
  }

  try {
    const [payload, ratings] = await Promise.all([
      getRadarCardPayload(prisma, actorId, movieId, ratingId),
      listRatingsForPerformance(prisma, actorId, movieId),
    ])

    if (!payload) {
      return NextResponse.json(
        { error: "No logged-in user ratings found for this performance" },
        { status: 404 },
      )
    }

    return NextResponse.json({ payload, ratings })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
