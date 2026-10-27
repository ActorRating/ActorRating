import type { NextRequest, NextResponse } from "next/server"

/**
 * Internal-traffic exclusion for first-party analytics.
 *
 * - `ar_internal=1` is set after a successful /admin auth. Analytics-only —
 *   never used for authorization.
 * - Storage is skipped when the cookie is present OR the session email equals
 *   `ADMIN_EMAIL`, unless overridden with `ar_track=1` (query) / `x-ar-track: 1`.
 */

export const INTERNAL_TRAFFIC_COOKIE = "ar_internal"
export const INTERNAL_TRAFFIC_COOKIE_VALUE = "1"
export const INTERNAL_TRAFFIC_COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60

/** Beacon / page query param that forces tracking even for internal traffic. */
export const ANALYTICS_TRACK_OVERRIDE_PARAM = "ar_track"
/** Request header equivalent of `ar_track=1`. */
export const ANALYTICS_TRACK_OVERRIDE_HEADER = "x-ar-track"

export function internalTrafficCookieOptions(): {
  path: string
  httpOnly: boolean
  sameSite: "lax"
  secure: boolean
  maxAge: number
} {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: INTERNAL_TRAFFIC_COOKIE_MAX_AGE_SEC,
  }
}

/** Attach `ar_internal=1` to a response (admin mark-internal route). */
export function applyInternalTrafficCookie(res: NextResponse): void {
  res.cookies.set(
    INTERNAL_TRAFFIC_COOKIE,
    INTERNAL_TRAFFIC_COOKIE_VALUE,
    internalTrafficCookieOptions(),
  )
}

export function hasInternalTrafficCookie(request: NextRequest): boolean {
  return (
    request.cookies.get(INTERNAL_TRAFFIC_COOKIE)?.value ===
    INTERNAL_TRAFFIC_COOKIE_VALUE
  )
}

export function isAdminAnalyticsEmail(
  email: string | null | undefined,
): boolean {
  const admin = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  if (!admin || !email) return false
  return email.toLowerCase().trim() === admin
}

/**
 * True when the caller asked to record analytics despite internal exclusion.
 * Accepts `?ar_track=1` on the request URL or header `x-ar-track: 1`.
 */
export function hasAnalyticsTrackOverride(request: NextRequest): boolean {
  if (request.nextUrl.searchParams.get(ANALYTICS_TRACK_OVERRIDE_PARAM) === "1") {
    return true
  }
  const header = request.headers.get(ANALYTICS_TRACK_OVERRIDE_HEADER)
  if (!header) return false
  const v = header.trim().toLowerCase()
  return v === "1" || v === "true" || v === "yes"
}

/**
 * Whether pageview / dwell / product-event routes should skip DB writes.
 * Override always wins. Pure aside from reading `ADMIN_EMAIL`.
 */
export function shouldSkipAnalyticsStorage(
  request: NextRequest,
  sessionEmail?: string | null,
): boolean {
  if (hasAnalyticsTrackOverride(request)) return false
  if (hasInternalTrafficCookie(request)) return true
  if (isAdminAnalyticsEmail(sessionEmail)) return true
  return false
}
