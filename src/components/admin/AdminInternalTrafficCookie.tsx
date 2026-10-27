"use client"

import { useEffect } from "react"

/**
 * After /admin auth succeeds, ask the server to set `ar_internal=1` so
 * first-party analytics beacons from this browser are not stored.
 */
export function AdminInternalTrafficCookie() {
  useEffect(() => {
    void fetch("/api/admin/mark-internal", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {})
  }, [])
  return null
}
