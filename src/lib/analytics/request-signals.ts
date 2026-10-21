/**
 * Request-level analytics signals for pageview / product-event beacons.
 *
 * Cloudflare headers (cf-ipcountry, bot score, ASN) are intentionally NOT read
 * until verified live. Keep this module the single place to wire them later —
 * prefer nullable fields and never invent values.
 */

import type { NextRequest } from "next/server"

export type RequestAnalyticsSignals = {
  /** Reserved: cf-ipcountry when confirmed to reach Next.js. Always null for now. */
  country: string | null
  /** Reserved: coarse ASN / org when available via header or approved lookup. */
  asn: string | null
  acceptLanguagePresent: boolean
  secFetchPresent: boolean
  /** Reserved: Cloudflare verified-bot / bot-score headers when confirmed. */
  cloudflareBotHeaderPresent: boolean
}

/**
 * Extract only signals that are safe/available today.
 * Adding country later: read `cf-ipcountry` here when ops confirms it arrives.
 */
export function extractRequestAnalyticsSignals(
  request: NextRequest,
): RequestAnalyticsSignals {
  const acceptLanguage = request.headers.get("accept-language")
  const secFetchSite = request.headers.get("sec-fetch-site")
  const secFetchMode = request.headers.get("sec-fetch-mode")
  const secFetchDest = request.headers.get("sec-fetch-dest")

  return {
    country: null,
    asn: null,
    acceptLanguagePresent: Boolean(acceptLanguage?.trim()),
    secFetchPresent: Boolean(
      secFetchSite?.trim() || secFetchMode?.trim() || secFetchDest?.trim(),
    ),
    // Do not probe cf-* until verified — always false/null for now.
    cloudflareBotHeaderPresent: false,
  }
}
