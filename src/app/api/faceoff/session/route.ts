export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { sessionPayload, withFaceOffSession } from "@/lib/faceoff/http"
import { parseMode } from "@/lib/faceoff/pair"
import { setSessionMode } from "@/lib/faceoff/session"

export async function POST(request: NextRequest) {
  const gate = await withFaceOffSession(request, "faceoffSession")
  if (!gate.ok) return gate.response

  let mode: string | undefined
  try {
    const body = await request.json().catch(() => ({}))
    mode = typeof body?.mode === "string" ? body.mode : undefined
  } catch {
    mode = undefined
  }
  const parsed = parseMode(mode)
  if (parsed) {
    await setSessionMode(gate.session.id, parsed)
    gate.session.mode = parsed === "actor" ? "ACTOR" : parsed === "performance" ? "PERFORMANCE" : "MIXED"
  }

  const response = NextResponse.json({
    ...sessionPayload(gate.session),
    justLinked: gate.justLinked,
  })
  gate.applyCookie(response)
  return response
}
