export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withFaceOffSession } from "@/lib/faceoff/http"
import { shareMatchup } from "@/lib/faceoff/share"

const bodySchema = z.object({
  leftId: z.string().min(8).max(64),
  rightId: z.string().min(8).max(64),
})

export async function POST(request: NextRequest) {
  const gate = await withFaceOffSession(request, "faceoffPrefs")
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
    const share = await shareMatchup(parsed.data.leftId, parsed.data.rightId)
    if (!share) {
      return NextResponse.json({ error: "That matchup cannot be shared." }, { status: 400 })
    }
    const response = NextResponse.json(share)
    gate.applyCookie(response)
    return response
  } catch {
    return NextResponse.json({ error: "Could not create a share link." }, { status: 500 })
  }
}
