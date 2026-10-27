"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import {
  analyticsTrackOverrideHeaders,
  analyticsTrackOverrideQuery,
  collectClientSignals,
  createDwellState,
  dwellMarkInteraction,
  dwellOnVisibility,
  dwellTotalMs,
  getCurrentPageViewId,
  pageViewKey,
  sendDwellBeacon,
  setCurrentPageViewId,
  type DwellState,
} from "@/lib/analytics/pageview-client"

/**
 * Sends a first-party pageview beacon on initial load and App Router navigations,
 * then reports time-on-page (visible dwell) for that pageview on pagehide /
 * tab-hide / route change. Failures are ignored.
 */
export function FirstPartyPageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastKey = useRef<string | null>(null)
  const dwellRef = useRef<DwellState | null>(null)
  const dwellPathRef = useRef<string>("/")

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return

    const search = searchParams?.toString() ? `?${searchParams.toString()}` : ""
    const key = pageViewKey(pathname, search)
    dwellPathRef.current = pathname

    // One pageview per distinct URL (Strict Mode / remounts re-run this effect).
    if (lastKey.current !== key) {
      lastKey.current = key
      const payload = JSON.stringify({
        path: pathname,
        search,
        referrer: document.referrer || null,
        signals: collectClientSignals(),
      })

      // Prefer fetch (not sendBeacon) so Set-Cookie for ar_src / ar_vid / ar_sid is applied.
      void fetch(`/api/analytics/pageview${analyticsTrackOverrideQuery()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...analyticsTrackOverrideHeaders(),
        },
        body: payload,
        keepalive: true,
        credentials: "same-origin",
      })
        .then(async (res) => {
          if (res.status !== 200) return
          const data = (await res.json().catch(() => null)) as { id?: unknown } | null
          if (data && typeof data.id === "string") setCurrentPageViewId(key, data.id)
        })
        .catch(() => {})
    }

    // ---- dwell accounting for this page (always re-armed) ----
    dwellRef.current = createDwellState(document.visibilityState === "visible", performance.now())

    const flush = () => {
      const state = dwellRef.current
      if (!state || state.sent) return
      const now = performance.now()
      const total = dwellTotalMs(state, now)
      dwellRef.current = { ...dwellOnVisibility(state, false, now), sent: true }
      sendDwellBeacon({
        id: getCurrentPageViewId(key),
        path: dwellPathRef.current,
        dwellMs: total,
        interaction: state.interaction,
      })
    }

    const onVis = () => {
      const state = dwellRef.current
      if (!state) return
      const visible = document.visibilityState === "visible"
      if (!visible) {
        // Tab hidden: report what we have so far; allow a later re-send with a larger total.
        const now = performance.now()
        const total = dwellTotalMs(state, now)
        dwellRef.current = dwellOnVisibility(state, false, now)
        sendDwellBeacon({
          id: getCurrentPageViewId(key),
          path: dwellPathRef.current,
          dwellMs: total,
          interaction: state.interaction,
        })
      } else {
        dwellRef.current = dwellOnVisibility(state, true, performance.now())
      }
    }
    const mark = (interaction: string) => () => {
      if (dwellRef.current) dwellRef.current = dwellMarkInteraction(dwellRef.current, interaction)
    }
    const onPointer = mark("pointermove")
    const onTouch = mark("touchstart")
    const onKey = mark("keydown")
    const onScroll = mark("scroll")

    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("pagehide", flush)
    window.addEventListener("pointermove", onPointer, { passive: true, once: true })
    window.addEventListener("touchstart", onTouch, { passive: true, once: true })
    window.addEventListener("keydown", onKey, { passive: true, once: true })
    window.addEventListener("scroll", onScroll, { passive: true, once: true })

    return () => {
      // Route change: close out the previous page's dwell.
      flush()
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("pagehide", flush)
      window.removeEventListener("pointermove", onPointer)
      window.removeEventListener("touchstart", onTouch)
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("scroll", onScroll)
    }
  }, [pathname, searchParams])

  return null
}
