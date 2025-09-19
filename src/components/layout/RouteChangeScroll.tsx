"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export default function RouteChangeScroll() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Always load pages at the top and disable browser scroll restoration
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      try {
        window.history.scrollRestoration = "manual"
      } catch {}
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [])

  // On route or query change, scroll to top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [pathname, searchParams])

  return null
}



