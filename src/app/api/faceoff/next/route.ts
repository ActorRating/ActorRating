export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { sessionPayload, withFaceOffSession } from "@/lib/faceoff/http"
import { nextMatchup } from "@/lib/faceoff/matchmaking"

export async function GET(request: NextRequest) {
  const gate = await withFaceOffSession(request, "faceoffNext")
  if (!gate.ok) return gate.response

  const mode = request.nextUrl.searchParams.get("mode")
  const share = request.nextUrl.searchParams.get("share")
  try {
    const result = await nextMatchup({
      session: gate.session,
      requestedMode: mode,
      sharePublicId: share,
    })
    const response = NextResponse.json({
      ...sessionPayload(gate.session),
      mode: result.mode,
      matchup: result.matchup,
      empty: result.matchup ? null : result.reason ?? "No matchup is available.",
    })
    gate.applyCookie(response)
    return response
  } catch {
    return NextResponse.json({ error: "Could not load a matchup." }, { status: 500 })
  }
}
