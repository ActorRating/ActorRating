export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkRateLimitScopes } from "@/lib/rateLimit"
import { sessionPayload, withFaceOffSession } from "@/lib/faceoff/http"
import { FaceOffRequestError, submitFaceOffVote } from "@/lib/faceoff/vote"
import { prismaModeToName } from "@/lib/faceoff/session"

const bodySchema = z.object({
  matchupId: z.string().min(8).max(64),
  winnerId: z.string().min(8).max(64),
})

export async function POST(request: NextRequest) {
  const gate = await withFaceOffSession(request, "faceoffVote")
  if (!gate.ok) return gate.response

  const hourly = await checkRateLimitScopes({
    ip: gate.ip,
    action: "faceoffVoteHourly",
    userId: gate.userId,
  })
  if (!hourly.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  try {
    const result = await submitFaceOffVote({
      sessionId: gate.session.id,
      matchupId: parsed.data.matchupId,
      winnerId: parsed.data.winnerId,
      auth: gate.session.auth,
      mode: prismaModeToName(gate.session.mode),
      ip: gate.ip,
      userAgent: request.headers.get("user-agent"),
      userId: gate.userId,
    })
    const response = NextResponse.json({
      ...sessionPayload({ ...gate.session, choiceCount: result.choiceCount }),
      accepted: true,
      choiceCount: result.choiceCount,
      reveal: result.reveal,
      milestone: result.milestone,
    })
    gate.applyCookie(response)
    return response
  } catch (error) {
    if (error instanceof FaceOffRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Could not record that vote." }, { status: 500 })
  }
}
