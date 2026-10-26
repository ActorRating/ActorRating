/**
 * Request-level analytics signals for pageview / product-event beacons.
 *
 * Everything here is pure (headers in → signals out) so it can be unit tested.
 *
 * Cloudflare: the site is served Cloudflare → Traefik → Next. `cf-ipcountry`
 * and `cf-connecting-ip` arrive on every proxied request. The verified-bot flag
 * does NOT arrive as a header by default — it needs a Cloudflare Transform Rule
 * that sets `x-cf-verified-bot: 1` when `cf.client.bot` is true
 * (see docs/TRAFFIC_ANALYTICS.md). Bot score / JA4 are Enterprise-only.
 */

import type { NextRequest } from "next/server"

export const CF_VERIFIED_BOT_HEADER = "x-cf-verified-bot"

/** Minimal header reader so helpers accept NextRequest, Headers or a plain map. */
export type HeaderGetter = { get(name: string): string | null }

export function headersFromRecord(
  record: Record<string, string | null | undefined>,
): HeaderGetter {
  const lower = new Map<string, string>()
  for (const [k, v] of Object.entries(record)) {
    if (typeof v === "string") lower.set(k.toLowerCase(), v)
  }
  return { get: (name) => lower.get(name.toLowerCase()) ?? null }
}

export type RequestAnalyticsSignals = {
  /** cf-ipcountry (upper-case alpha-2) or null. "XX"/"T1" (unknown/Tor) kept as-is. */
  country: string | null
  acceptLanguagePresent: boolean
  secFetchPresent: boolean
  secChUaPresent: boolean
  /** Cloudflare verified bot via Transform Rule header. */
  cloudflareVerifiedBot: boolean
  /** Header-consistency problems that indicate a spoofed / automated client. */
  inconsistencies: HeaderInconsistency[]
}

export type HeaderInconsistency =
  /** UA says Chromium ≥ 90 but no `sec-ch-ua` — real Chromium always sends low-entropy hints. */
  | "ua_hint_mismatch"
  /** `sec-ch-ua` brand list contains HeadlessChrome. */
  | "headless_hint"
  /** UA says Chromium ≥ 90 but no `sec-fetch-*` headers at all. */
  | "missing_sec_fetch"
  /** Beacon came from another origin (sec-fetch-site present and not same-origin). */
  | "cross_site_beacon"
  /** UA says mobile but sec-ch-ua-mobile says desktop (or vice versa). */
  | "mobile_hint_mismatch"

/** Desktop/Android Chromium major version from UA, or null (iOS Chrome = CriOS, no hints). */
export function chromiumMajorFromUserAgent(userAgent: string): number | null {
  const ua = userAgent || ""
  if (/CriOS\//.test(ua)) return null
  // "Chrome/120.0.0.0" also covers Edg/, OPR/, SamsungBrowser/, Brave (Chromium-based).
  const m = /Chrome\/(\d{2,3})\./.exec(ua)
  if (!m) return null
  const major = Number(m[1])
  return Number.isFinite(major) ? major : null
}

/** Chromium versions that always send low-entropy client hints + sec-fetch. */
const CLIENT_HINTS_MIN_MAJOR = 90

export function detectHeaderInconsistencies(
  headers: HeaderGetter,
  userAgent: string,
): HeaderInconsistency[] {
  const out: HeaderInconsistency[] = []
  const secChUa = headers.get("sec-ch-ua")
  const secChUaMobile = headers.get("sec-ch-ua-mobile")
  const secFetchSite = headers.get("sec-fetch-site")
  const secFetchMode = headers.get("sec-fetch-mode")
  const secFetchDest = headers.get("sec-fetch-dest")
  const anySecFetch = Boolean(
    secFetchSite?.trim() || secFetchMode?.trim() || secFetchDest?.trim(),
  )

  const chromiumMajor = chromiumMajorFromUserAgent(userAgent)
  const modernChromium = chromiumMajor != null && chromiumMajor >= CLIENT_HINTS_MIN_MAJOR

  if (secChUa && /headlesschrome/i.test(secChUa)) out.push("headless_hint")
  if (modernChromium && !secChUa?.trim()) out.push("ua_hint_mismatch")
  if (modernChromium && !anySecFetch) out.push("missing_sec_fetch")

  if (secFetchSite && secFetchSite.trim() && secFetchSite.trim() !== "same-origin") {
    // Our beacons are same-origin fetch() POSTs. `none` would be a direct navigation (not a beacon).
    out.push("cross_site_beacon")
  }

  if (secChUaMobile?.trim() && modernChromium) {
    const hintMobile = secChUaMobile.trim() === "?1"
    const uaSaysMobile = /\bMobile\b/.test(userAgent)
    const uaSaysAndroid = /Android/.test(userAgent)
    // Android tablets are "Android" without "Mobile" and send ?0 — not a contradiction.
    if (hintMobile && !uaSaysMobile && !uaSaysAndroid) out.push("mobile_hint_mismatch")
    if (!hintMobile && uaSaysMobile) out.push("mobile_hint_mismatch")
  }

  return out
}

export function extractRequestAnalyticsSignals(
  request: Pick<NextRequest, "headers">,
): RequestAnalyticsSignals {
  const headers = request.headers
  const userAgent = headers.get("user-agent") || ""
  const acceptLanguage = headers.get("accept-language")
  const secFetchSite = headers.get("sec-fetch-site")
  const secFetchMode = headers.get("sec-fetch-mode")
  const secFetchDest = headers.get("sec-fetch-dest")
  const countryRaw = headers.get("cf-ipcountry")?.trim().toUpperCase() ?? ""

  return {
    country: /^[A-Z0-9]{2}$/.test(countryRaw) ? countryRaw : null,
    acceptLanguagePresent: Boolean(acceptLanguage?.trim()),
    secFetchPresent: Boolean(
      secFetchSite?.trim() || secFetchMode?.trim() || secFetchDest?.trim(),
    ),
    secChUaPresent: Boolean(headers.get("sec-ch-ua")?.trim()),
    cloudflareVerifiedBot: headers.get(CF_VERIFIED_BOT_HEADER)?.trim() === "1",
    inconsistencies: detectHeaderInconsistencies(headers, userAgent),
  }
}

/* ------------------------------------------------------------------------ */
/* Client-side signals posted by the beacon                                  */
/* ------------------------------------------------------------------------ */

export type ClientSignals = {
  webdriver: boolean | null
  screenW: number | null
  screenH: number | null
  viewportW: number | null
  viewportH: number | null
  dpr: number | null
  timezone: string | null
  languages: string | null
  touchPoints: number | null
  hardwareConcurrency: number | null
  /** Page Visibility state at beacon time. Fleets often beacon from hidden/prerender. */
  visibility: string | null
}

function num(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  if (value < min || value > max) return null
  return Math.round(value * 100) / 100
}

function str(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const t = value.trim()
  return t ? t.slice(0, max) : null
}

/** Sanitize the untrusted `signals` object from the beacon body. */
export function parseClientSignals(raw: unknown): ClientSignals | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const out: ClientSignals = {
    webdriver: typeof r.webdriver === "boolean" ? r.webdriver : null,
    screenW: num(r.screenW, 0, 20000),
    screenH: num(r.screenH, 0, 20000),
    viewportW: num(r.viewportW, 0, 20000),
    viewportH: num(r.viewportH, 0, 20000),
    dpr: num(r.dpr, 0, 10),
    timezone: str(r.timezone, 64),
    languages: str(r.languages, 200),
    touchPoints: num(r.touchPoints, 0, 50),
    hardwareConcurrency: num(r.hardwareConcurrency, 0, 1024),
    visibility: str(r.visibility, 20),
  }
  const anyPresent = Object.values(out).some((v) => v !== null)
  return anyPresent ? out : null
}

export type ClientSignalFlag =
  /** navigator.webdriver === true (Selenium / Puppeteer / Playwright without stealth). */
  | "webdriver"
  /** Screen reports 0×0 or viewport 0×0 — not a rendering browser. */
  | "zero_screen"

export function detectClientSignalFlags(signals: ClientSignals | null): ClientSignalFlag[] {
  if (!signals) return []
  const out: ClientSignalFlag[] = []
  if (signals.webdriver === true) out.push("webdriver")
  if (
    (signals.screenW === 0 && signals.screenH === 0) ||
    (signals.viewportW === 0 && signals.viewportH === 0)
  ) {
    out.push("zero_screen")
  }
  return out
}
