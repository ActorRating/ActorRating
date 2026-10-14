export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { isFaceOffEnabled } from "@/lib/faceoff/constants"
import { FACEOFF_COOKIE, faceOffCookieOptions } from "@/lib/faceoff/cookie"
import { linkGuestSessionToUser } from "@/lib/faceoff/session"
import { assertFaceOffOrigin } from "@/lib/faceoff/http"

export async function POST(request: NextRequest) {
  if (!isFaceOffEnabled()) {
    return NextResponse.json({ error: "Face-Off is not available." }, { status: 404 })
  }
  if (!assertFaceOffOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 400 })
  }
  const authSession = await auth()
  const userId = authSession?.user?.id
  if (!userId) {
    return NextResponse.json({ error: "Sign in to save your Face-Off history." }, { status: 401 })
  }
  const guestToken = request.cookies.get(FACEOFF_COOKIE)?.value ?? null
  try {
    const result = await linkGuestSessionToUser(userId, guestToken)
    const response = NextResponse.json({
      linked: result.linked,
      already: result.already,
    })
    if (result.cleared) {
      response.cookies.set(FACEOFF_COOKIE, "", { ...faceOffCookieOptions(), maxAge: 0 })
    }
    return response
  } catch {
    return NextResponse.json(
      { error: "Your guest history is still on this browser. Try saving it again." },
      { status: 500 },
    )
  }
}
