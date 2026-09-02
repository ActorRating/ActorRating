import "server-only"
import { createHmac, randomUUID, timingSafeEqual } from "crypto"
import type { NextResponse } from "next/server"

export const ANON_COOKIE_NAME = "ar_anon_id"
/** 1 year — lightweight persistent guest identity for rating upserts */
export const ANON_COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60

function signingSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET required for anonymous session cookies")
  }
  return secret
}

function signAnonId(id: string): string {
  const sig = createHmac("sha256", signingSecret()).update(id).digest("base64url")
  return `${id}.${sig}`
}

/** Verify signed cookie value; returns raw UUID or null. */
export function verifySignedAnonId(raw: string | null | undefined): string | null {
  if (!raw) return null
  const dot = raw.lastIndexOf(".")
  if (dot <= 0) return null
  const id = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  if (!id || !sig || id.length < 8) return null
  const expected = createHmac("sha256", signingSecret()).update(id).digest("base64url")
  if (sig.length !== expected.length) return null
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  return id
}

export function createAnonId(): string {
  return randomUUID()
}

export function buildAnonCookieValue(id: string): string {
  return signAnonId(id)
}

export type ResolvedAnonSession = {
  anonId: string
  /** True when a new id was minted (caller should Set-Cookie). */
  isNew: boolean
  cookieValue: string
}

/** Read existing anon id from cookie header value, or mint a new signed id. */
export function resolveAnonSession(existingCookie: string | null | undefined): ResolvedAnonSession {
  const verified = verifySignedAnonId(existingCookie)
  if (verified) {
    return { anonId: verified, isNew: false, cookieValue: buildAnonCookieValue(verified) }
  }
  const anonId = createAnonId()
  return { anonId, isNew: true, cookieValue: buildAnonCookieValue(anonId) }
}

export function anonCookieOptions(): {
  httpOnly: true
  secure: boolean
  sameSite: "lax"
  path: "/"
  maxAge: number
} {
  const secure =
    process.env.NODE_ENV === "production" ||
    (process.env.NEXTAUTH_URL ?? "").startsWith("https")
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ANON_COOKIE_MAX_AGE_SEC,
  }
}

export function applyAnonCookie(response: NextResponse, cookieValue: string): void {
  response.cookies.set(ANON_COOKIE_NAME, cookieValue, anonCookieOptions())
}

export function clearAnonCookie(response: NextResponse): void {
  response.cookies.set(ANON_COOKIE_NAME, "", { ...anonCookieOptions(), maxAge: 0 })
}
