"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * Sends a first-party pageview beacon on initial load and App Router navigations.
 * Uses sendBeacon when available; failures are ignored.
 */
export function FirstPartyPageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return

    const search = searchParams?.toString() ? `?${searchParams.toString()}` : ""
    const key = `${pathname}${search}`
    if (lastKey.current === key) return
    lastKey.current = key

    const payload = JSON.stringify({
      path: pathname,
      search,
      referrer: document.referrer || null,
    })

    // Prefer fetch (not sendBeacon) so Set-Cookie for ar_src attribution is applied.
    void fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {})
  }, [pathname, searchParams])

  return null
}
