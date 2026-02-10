"use client"

import { useEffect } from "react"

declare global {
  interface Window {
    __SEARCH_PRELOAD__?: {
      actors: Array<{ id: string; name: string; slug: string | null }>
      movies: Array<{ id: string; title: string; slug: string | null; year: number }>
    }
  }
}

/** Fetches search preload on app load so SearchBar has data before the user types. */
export function SearchPreloadTrigger() {
  useEffect(() => {
    if (typeof window === "undefined" || window.__SEARCH_PRELOAD__) return
    fetch("/api/search/preload")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.actors && d?.movies) window.__SEARCH_PRELOAD__ = d
      })
      .catch(() => {})
  }, [])
  return null
}
