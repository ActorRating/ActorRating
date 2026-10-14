import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getClientIp } from "@/lib/requestProtection"
import { checkRateLimitScopes } from "@/lib/rateLimit"
import { isFaceOffEnabled } from "@/lib/faceoff/constants"
import { FACEOFF_COOKIE, faceOffCookieOptions, hashGuestToken } from "@/lib/faceoff/cookie"
import { ensureFaceOffPool } from "@/lib/faceoff/sync-pool"
import { resolveFaceOffSession, type FaceOffSessionRecord } from "@/lib/faceoff/session"

export function faceOffDisabledResponse() {
  return NextResponse.json({ error: "Face-Off is not available." }, { status: 404 })
}

export function assertFaceOffOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return true
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  if (!host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export async function withFaceOffSession(
  request: NextRequest,
  action: "faceoffSession" | "faceoffNext" | "faceoffVote" | "faceoffPrefs",
): Promise<
  | { ok: false; response: NextResponse }
  | {
      ok: true
      session: FaceOffSessionRecord
      userId: string | null
      ip: string
      justLinked: boolean
      applyCookie: (response: NextResponse) => void
    }
> {
  if (!isFaceOffEnabled()) {
    return { ok: false, response: faceOffDisabledResponse() }
  }
  if (request.method !== "GET" && !assertFaceOffOrigin(request)) {
    return { ok: false, response: NextResponse.json({ error: "Invalid request origin." }, { status: 400 }) }
  }

  const ip = getClientIp(request)
  let userId: string | null = null
  try {
    const authSession = await auth()
    userId = authSession?.user?.id ?? null
  } catch {
    userId = null
  }

  const guestToken = request.cookies.get(FACEOFF_COOKIE)?.value ?? null
  let rate: { allowed: boolean }
  try {
    rate = await checkRateLimitScopes({
      ip,
      action,
      userId,
      anonId: guestToken ? hashGuestToken(guestToken).slice(0, 32) : null,
    })
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Face-Off is temporarily unavailable." }, { status: 500 }),
    }
  }
  if (!rate.allowed) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    }
  }

  try {
    await ensureFaceOffPool()
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Face-Off is temporarily unavailable." }, { status: 500 }),
    }
  }

  let resolved: Awaited<ReturnType<typeof resolveFaceOffSession>>
  try {
    resolved = await resolveFaceOffSession({ userId, guestToken })
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Could not start a Face-Off session." }, { status: 500 }),
    }
  }

  const applyCookie = (response: NextResponse) => {
    if (resolved.clearGuestCookie) {
      response.cookies.set(FACEOFF_COOKIE, "", { ...faceOffCookieOptions(), maxAge: 0 })
      return
    }
    if (resolved.guestTokenToSet) {
      response.cookies.set(FACEOFF_COOKIE, resolved.guestTokenToSet, faceOffCookieOptions())
    }
  }

  return {
    ok: true,
    session: resolved.session,
    userId,
    ip,
    justLinked: resolved.clearGuestCookie,
    applyCookie,
  }
}

export function sessionPayload(session: FaceOffSessionRecord) {
  const mode = session.mode === "ACTOR" ? "actor" : session.mode === "PERFORMANCE" ? "performance" : "mixed"
  const step = session.choiceCount % 5
  return {
    mode,
    choiceCount: session.choiceCount,
    progress: step,
    milestone: 5,
    revealReady: session.choiceCount > 0 && step === 0,
    auth: session.auth,
    resumed: session.resumed,
  }
}
