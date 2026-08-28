import type { NextRequest, NextResponse } from "next/server"
import {
  AR_SRC_COOKIE,
  AR_SRC_MAX_AGE_SEC,
  arSrcCookieOptions,
  normalizeAcquisitionSource,
} from "@/lib/tracking/source"

export const AR_UTM_MEDIUM_COOKIE = "ar_utm_medium"
export const AR_UTM_CAMPAIGN_COOKIE = "ar_utm_campaign"
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
  utm_content: string | null
}

export function readAttributionFromRequest(
  request: NextRequest,
): StoredAttribution {
  const source = normalizeAcquisitionSource(
    request.cookies.get(AR_SRC_COOKIE)?.value,
  )
  return {
    source,
    utm_source: source,
    utm_medium: clip(request.cookies.get(AR_UTM_MEDIUM_COOKIE)?.value, 100),
    utm_campaign: clip(request.cookies.get(AR_UTM_CAMPAIGN_COOKIE)?.value, 200),
    utm_content: clip(request.cookies.get(AR_UTM_CONTENT_COOKIE)?.value, 200),
  }
}

/** Persist first-touch UTM detail cookies alongside ar_src. */
export function applyFirstTouchAttributionCookies(
  response: NextResponse,
  input: {
    source: string
    utmMedium: string | null
    utmCampaign: string | null
    utmContent: string | null
    existingSource?: string | null
  },
) {
  if (input.existingSource) return

  response.cookies.set(AR_SRC_COOKIE, input.source, arSrcCookieOptions())

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
  if (input.utmContent) {
    response.cookies.set(
      AR_UTM_CONTENT_COOKIE,
      input.utmContent,
      UTM_COOKIE_OPTIONS,
    )
  }
}
