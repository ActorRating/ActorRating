import { createHmac, randomUUID, timingSafeEqual } from "crypto"
import type { NextRequest, NextResponse } from "next/server"

/**
 * First-party visitor + session identity for traffic analytics.
 *
 * - `ar_vid`: signed visitor id, 1 year, HttpOnly. One per browser profile.
 * - `ar_sid`: signed session id, rolling 30-minute inactivity window, HttpOnly.
 *   Refreshed on every pageview beacon so the window slides.
 *
 * Both are analytics-only (never used for auth). Signing stops clients from
 * minting arbitrary ids to inflate "visitors".
 */

export const VISITOR_COOKIE_NAME = "ar_vid"
export const SESSION_COOKIE_NAME = "ar_sid"
export const VISITOR_COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60
/** GA/Umami-style inactivity timeout. */
export const SESSION_INACTIVITY_SEC = 30 * 60

function signingSecret(): string {
  return (
    process.env.ANALYTICS_IP_SALT?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "actorrating-analytics"
  )
}

function sign(id: string): string {
  return createHmac("sha256", signingSecret()).update(id).digest("base64url")
}

export function buildSignedId(id: string): string {
  return `${id}.${sign(id)}`
}

/** Verify `id.sig`; returns the raw id or null. Pure apart from the secret. */
export function verifySignedId(raw: string | null | undefined): string | null {
  if (!raw) return null
  const dot = raw.lastIndexOf(".")
  if (dot <= 0) return null
  const id = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  if (!id || !sig || id.length < 8 || id.length > 64) return null
  const expected = sign(id)
  if (sig.length !== expected.length) return null
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? id : null
  } catch {
    return null
  }
}

export type ResolvedVisitorSession = {
  visitorId: string
  sessionId: string
  isNewVisitor: boolean
  isNewSession: boolean
}

/**
 * Pure resolver: given the raw cookie values, return ids (minting when missing
 * or tampered). Caller is responsible for setting cookies on the response.
 */
export function resolveVisitorSession(input: {
  visitorCookie: string | null | undefined
  sessionCookie: string | null | undefined
  mintId?: () => string
}): ResolvedVisitorSession {
  const mint = input.mintId ?? randomUUID
  const visitor = verifySignedId(input.visitorCookie)
  const session = verifySignedId(input.sessionCookie)
  const visitorId = visitor ?? mint()
  // A new visitor never continues an old session (prevents cross-profile session reuse).
  const sessionId = visitor && session ? session : mint()
  return {
    visitorId,
    sessionId,
    isNewVisitor: !visitor,
    isNewSession: !(visitor && session),
  }
}

export function readVisitorSession(request: NextRequest): ResolvedVisitorSession {
  return resolveVisitorSession({
    visitorCookie: request.cookies.get(VISITOR_COOKIE_NAME)?.value,
    sessionCookie: request.cookies.get(SESSION_COOKIE_NAME)?.value,
  })
}

/** Read-only variant: returns ids only when cookies are present and valid. */
export function peekVisitorSession(request: NextRequest): {
  visitorId: string | null
  sessionId: string | null
} {
  const visitorId = verifySignedId(request.cookies.get(VISITOR_COOKIE_NAME)?.value)
  const sessionId = visitorId
    ? verifySignedId(request.cookies.get(SESSION_COOKIE_NAME)?.value)
    : null
  return { visitorId, sessionId }
}

function cookieSecure(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    (process.env.NEXTAUTH_URL ?? "").startsWith("https")
  )
}

/** Always (re)set both cookies: visitor to extend 1y, session to slide the 30m window. */
export function applyVisitorSessionCookies(
  response: NextResponse,
  ids: { visitorId: string; sessionId: string },
): void {
  const base = {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
  }
  response.cookies.set(VISITOR_COOKIE_NAME, buildSignedId(ids.visitorId), {
    ...base,
    maxAge: VISITOR_COOKIE_MAX_AGE_SEC,
  })
  response.cookies.set(SESSION_COOKIE_NAME, buildSignedId(ids.sessionId), {
    ...base,
    maxAge: SESSION_INACTIVITY_SEC,
  })
}
