export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withFaceOffSession } from "@/lib/faceoff/http"
import { parseMode } from "@/lib/faceoff/pair"
import { setSessionMode } from "@/lib/faceoff/session"

const bodySchema = z.object({
  mode: z.enum(["actor", "performance", "mixed"]).optional(),
  genres: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
  eras: z.array(z.enum(["classic", "modern", "recent"])).max(3).optional(),
  familiarity: z.enum(["familiar", "balanced", "discovery"]).optional(),
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
    return NextResponse.json({ error: "Invalid preferences." }, { status: 400 })
  }
  const mode = parseMode(parsed.data.mode)
  if (mode) await setSessionMode(gate.session.id, mode)
  await prisma.faceOffSession.update({
    where: { id: gate.session.id },
    data: {
      preferences: {
        genres: parsed.data.genres ?? [],
        eras: parsed.data.eras ?? [],
        familiarity: parsed.data.familiarity ?? "balanced",
      },
    },
  })
  const response = NextResponse.json({ ok: true })
  gate.applyCookie(response)
  return response
}
