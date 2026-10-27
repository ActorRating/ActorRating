/**
 * Browser-side helpers shared by the pageview, dwell and qualified_visit
 * trackers. No React here so it stays unit-testable.
 */

export type BeaconClientSignals = {
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
  visibility: string | null
}

/** Cheap, non-fingerprinting-grade signals. All optional; failures → null. */
export function collectClientSignals(): BeaconClientSignals | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") return null
  const safe = <T,>(fn: () => T): T | null => {
    try {
      const v = fn()
      return v === undefined ? null : v
    } catch {
      return null
    }
  }
  return {
    webdriver: safe(() => (typeof navigator.webdriver === "boolean" ? navigator.webdriver : null)),
    screenW: safe(() => window.screen?.width ?? null),
    screenH: safe(() => window.screen?.height ?? null),
    viewportW: safe(() => window.innerWidth),
    viewportH: safe(() => window.innerHeight),
    dpr: safe(() => window.devicePixelRatio),
    timezone: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? null),
    languages: safe(() =>
      Array.isArray(navigator.languages) && navigator.languages.length > 0
        ? navigator.languages.slice(0, 6).join(",")
        : navigator.language ?? null,
    ),
    touchPoints: safe(() => navigator.maxTouchPoints ?? null),
    hardwareConcurrency: safe(() => navigator.hardwareConcurrency ?? null),
    visibility: safe(() => document.visibilityState),
  }
}

/* ---------------- current PageView id registry ---------------- */

const pageViewIds = new Map<string, string>()

export function pageViewKey(pathname: string, search: string): string {
  return `${pathname}${search}`
}

export function setCurrentPageViewId(key: string, id: string | null): void {
  if (id) pageViewIds.set(key, id)
  else pageViewIds.delete(key)
}

export function getCurrentPageViewId(key: string): string | null {
  return pageViewIds.get(key) ?? null
}

/* ---------------- dwell accounting (pure) ---------------- */

export type DwellState = {
  accumulatedMs: number
  visibleSince: number | null
  interaction: string | null
  sent: boolean
}

export function createDwellState(isVisible: boolean, now: number): DwellState {
  return {
    accumulatedMs: 0,
    visibleSince: isVisible ? now : null,
    interaction: null,
    sent: false,
  }
}

export function dwellOnVisibility(state: DwellState, isVisible: boolean, now: number): DwellState {
  if (isVisible) {
    return state.visibleSince == null ? { ...state, visibleSince: now } : state
  }
  if (state.visibleSince == null) return state
  return {
    ...state,
    accumulatedMs: state.accumulatedMs + Math.max(0, now - state.visibleSince),
    visibleSince: null,
  }
}

export function dwellTotalMs(state: DwellState, now: number): number {
  const open = state.visibleSince == null ? 0 : Math.max(0, now - state.visibleSince)
  return Math.round(state.accumulatedMs + open)
}

export function dwellMarkInteraction(state: DwellState, interaction: string): DwellState {
  return state.interaction ? state : { ...state, interaction }
}

/**
 * When the current page URL has `?ar_track=1`, forward that override on beacons
 * so internal traffic (admin cookie / ADMIN_EMAIL) can still be recorded for tests.
 * sendBeacon cannot set headers — use the query string there.
 */
export function pageHasAnalyticsTrackOverride(): boolean {
  if (typeof window === "undefined") return false
  try {
    return new URLSearchParams(window.location.search).get("ar_track") === "1"
  } catch {
    return false
  }
}

export function analyticsTrackOverrideQuery(): string {
  return pageHasAnalyticsTrackOverride() ? "?ar_track=1" : ""
}

export function analyticsTrackOverrideHeaders(): Record<string, string> {
  return pageHasAnalyticsTrackOverride() ? { "x-ar-track": "1" } : {}
}

/** Post the dwell beacon (sendBeacon preferred; keepalive fetch fallback). */
export function sendDwellBeacon(payload: {
  id: string | null
  path: string
  dwellMs: number
  interaction: string | null
}): void {
  if (typeof window === "undefined") return
  if (payload.dwellMs < 250) return // nothing meaningful to record
  const json = JSON.stringify(payload)
  const url = `/api/analytics/dwell${analyticsTrackOverrideQuery()}`
  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([json], { type: "application/json" })
      if (navigator.sendBeacon(url, blob)) return
    }
  } catch {
    // fall through
  }
  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...analyticsTrackOverrideHeaders(),
    },
    body: json,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {})
}
