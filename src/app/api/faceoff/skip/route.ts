export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { sessionPayload, withFaceOffSession } from "@/lib/faceoff/http"
import { skipFaceOffMatchup } from "@/lib/faceoff/skip"
import { FaceOffRequestError } from "@/lib/faceoff/vote"

const bodySchema = z.object({
  matchupId: z.string().min(8).max(64),
})

export async function POST(request: NextRequest) {
  const gate = await withFaceOffSession(request, "faceoffNext")
  if (!gate.ok) return gate.response

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
    const result = await skipFaceOffMatchup({
      session: gate.session,
      matchupId: parsed.data.matchupId,
    })
    const response = NextResponse.json({
      ...sessionPayload({ ...gate.session, choiceCount: result.choiceCount }),
      accepted: false,
      skipped: true,
      choiceCount: result.choiceCount,
      reveal: false,
      mode: result.mode,
      matchup: result.matchup,
      empty: result.empty,
    })
    gate.applyCookie(response)
    return response
  } catch (error) {
    if (error instanceof FaceOffRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Could not skip that matchup." }, { status: 500 })
  }
}
