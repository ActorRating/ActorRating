export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { isFaceOffEnabled } from "@/lib/faceoff/constants"
import { faceOffLeaderboard } from "@/lib/faceoff/leaderboard"

export async function GET(request: NextRequest) {
  if (!isFaceOffEnabled()) {
    return NextResponse.json({ error: "Face-Off is not available." }, { status: 404 })
  }
  const typeParam = request.nextUrl.searchParams.get("type")
  const type = typeParam === "performance" ? "performance" : "actor"
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1")
  try {
    const board = await faceOffLeaderboard(type, page)
    return NextResponse.json(board)
  } catch {
    return NextResponse.json({ error: "Could not load rankings." }, { status: 500 })
  }
}
