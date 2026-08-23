"use client"

/**
 * Default browser scroll restoration. Soft navigations scroll to top via
 * Next.js; hard refreshes / bfcache use the browser default.
 * Intentionally does not hijack scrollTo or intercept link clicks.
 */
export default function RouteChangeScroll() {
  return null
}
