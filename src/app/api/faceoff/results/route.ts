export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { withFaceOffSession } from "@/lib/faceoff/http"
import { sessionResults } from "@/lib/faceoff/results"

export async function GET(request: NextRequest) {
  const gate = await withFaceOffSession(request, "faceoffNext")
  if (!gate.ok) return gate.response
  try {
    const results = await sessionResults(gate.session.id)
    const response = NextResponse.json(results)
    gate.applyCookie(response)
    return response
  } catch {
    return NextResponse.json({ error: "Could not load results." }, { status: 500 })
  }
}
