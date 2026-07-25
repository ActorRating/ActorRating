"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

/**
 * Fires GA4 page_view on App Router client navigations.
 * Root layout loads gtag once; without this, rate/movie/actor SPA transitions
 * would not register as tagged page views in Tag Quality / GA4 reports.
 */
export function GaPageViewTracker({ measurementId }: { measurementId: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isFirstLoad = useRef(true)

  useEffect(() => {
    if (!measurementId || typeof window === "undefined") return
    if (typeof window.gtag !== "function") return

    // Initial page_view is sent by the root-layout gtag('config') bootstrap.
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      return
    }

    const query = searchParams?.toString()
    const pagePath = query ? `${pathname}?${query}` : pathname

    window.gtag("config", measurementId, {
      page_path: pagePath,
    })
  }, [measurementId, pathname, searchParams])

  return null
}
