"use client"

import { useEffect } from "react"

/**
 * Listens for Webpack/Next.js chunk load failures and performs a one-time
 * cache-busting reload to recover from mismatched client assets after deploys.
 */
export default function ChunkErrorReload() {
  useEffect(() => {
    const hasRetryParam = () => {
      try {
        const params = new URLSearchParams(window.location.search)
        return params.has("_chunk_retry")
      } catch {
        return false
      }
    }

    const reloadWithBuster = () => {
      if (hasRetryParam()) return
      try {
        const url = new URL(window.location.href)
        url.searchParams.set("_chunk_retry", Date.now().toString())
        window.location.replace(url.toString())
      } catch {
        // Fallback hard reload
        window.location.reload()
      }
    }

    const handleError = (event: ErrorEvent) => {
      const error = event?.error as any
      const name = error?.name || ""
      const message = error?.message || ""
      if (name === "ChunkLoadError" || message.includes("Loading chunk") || message.includes("ChunkLoadError")) {
        reloadWithBuster()
      }
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason as any
      const name = reason?.name || ""
      const message = reason?.message || ""
      if (name === "ChunkLoadError" || message?.includes?.("Loading chunk") || message?.includes?.("ChunkLoadError")) {
        reloadWithBuster()
      }
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleRejection)
    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleRejection)
    }
  }, [])

  return null
}














