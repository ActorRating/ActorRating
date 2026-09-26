import type { NextRequest, NextResponse } from "next/server"
import {
  AR_SRC_COOKIE,
  AR_SRC_MAX_AGE_SEC,
  arSrcCookieOptions,
  normalizeAcquisitionSource,
} from "@/lib/tracking/source"

export const AR_UTM_SOURCE_COOKIE = "ar_utm_source"
export const AR_UTM_MEDIUM_COOKIE = "ar_utm_medium"
export const AR_UTM_CAMPAIGN_COOKIE = "ar_utm_campaign"
export const AR_UTM_TERM_COOKIE = "ar_utm_term"
export const AR_UTM_CONTENT_COOKIE = "ar_utm_content"

const UTM_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: false,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: AR_SRC_MAX_AGE_SEC,
}

function clip(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

export type StoredAttribution = {
  source: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
}

export type SignupUtmFields = {
  signupUtmSource: string | null
  signupUtmMedium: string | null
  signupUtmCampaign: string | null
  signupUtmTerm: string | null
  signupUtmContent: string | null
}

export type RatingUtmFields = {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
}

export function readAttributionFromRequest(
  request: NextRequest,
): StoredAttribution {
  const source = normalizeAcquisitionSource(
    request.cookies.get(AR_SRC_COOKIE)?.value,
  )
  const rawSource = clip(request.cookies.get(AR_UTM_SOURCE_COOKIE)?.value, 100)
  return {
    source,
    utm_source: rawSource ?? source,
    utm_medium: clip(request.cookies.get(AR_UTM_MEDIUM_COOKIE)?.value, 100),
    utm_campaign: clip(request.cookies.get(AR_UTM_CAMPAIGN_COOKIE)?.value, 200),
    utm_term: clip(request.cookies.get(AR_UTM_TERM_COOKIE)?.value, 200),
    utm_content: clip(request.cookies.get(AR_UTM_CONTENT_COOKIE)?.value, 200),
  }
}

/** Cookie jar shape shared by NextRequest cookies and `cookies()` from next/headers. */
export function readSignupUtmFromCookieStore(store: {
  get(name: string): { value: string } | undefined
}): SignupUtmFields {
  return {
    signupUtmSource: clip(store.get(AR_UTM_SOURCE_COOKIE)?.value, 100),
    signupUtmMedium: clip(store.get(AR_UTM_MEDIUM_COOKIE)?.value, 100),
    signupUtmCampaign: clip(store.get(AR_UTM_CAMPAIGN_COOKIE)?.value, 200),
    signupUtmTerm: clip(store.get(AR_UTM_TERM_COOKIE)?.value, 200),
    signupUtmContent: clip(store.get(AR_UTM_CONTENT_COOKIE)?.value, 200),
  }
}

export function ratingUtmFromSignup(fields: SignupUtmFields): RatingUtmFields {
  return {
    utmSource: fields.signupUtmSource,
    utmMedium: fields.signupUtmMedium,
    utmCampaign: fields.signupUtmCampaign,
    utmTerm: fields.signupUtmTerm,
    utmContent: fields.signupUtmContent,
  }
}

/** Persist first-touch UTM detail cookies alongside ar_src. */
export function applyFirstTouchAttributionCookies(
  response: NextResponse,
  input: {
    source: string
    utmSource?: string | null
    utmMedium: string | null
    utmCampaign: string | null
    utmTerm?: string | null
    utmContent: string | null
    existingSource?: string | null
  },
) {
  if (input.existingSource) return

  response.cookies.set(AR_SRC_COOKIE, input.source, arSrcCookieOptions())

  const rawSource = input.utmSource?.trim() || input.source
  response.cookies.set(AR_UTM_SOURCE_COOKIE, rawSource.slice(0, 100), UTM_COOKIE_OPTIONS)

  if (input.utmMedium) {
    response.cookies.set(AR_UTM_MEDIUM_COOKIE, input.utmMedium, UTM_COOKIE_OPTIONS)
  }
  if (input.utmCampaign) {
    response.cookies.set(
      AR_UTM_CAMPAIGN_COOKIE,
      input.utmCampaign,
      UTM_COOKIE_OPTIONS,
    )
  }
  if (input.utmTerm) {
    response.cookies.set(AR_UTM_TERM_COOKIE, input.utmTerm, UTM_COOKIE_OPTIONS)
  }
  if (input.utmContent) {
    response.cookies.set(
      AR_UTM_CONTENT_COOKIE,
      input.utmContent,
      UTM_COOKIE_OPTIONS,
    )
  }
}
