/**
 * Observational X capability cache — no live probe calls.
 * States: available | unavailable | unknown
 * Transient failures (429/5xx/timeout) → unknown, never permanent unavailable.
 */

import type { DiscoveryProviderCapability } from "@/lib/arie/discovery/types"
import { arieXBearerToken } from "@/lib/arie/config"

export type CapabilityState = "available" | "unavailable" | "unknown"

type CapabilityCache = Record<DiscoveryProviderCapability, CapabilityState>

const cache: CapabilityCache = {
  user_lookup: "unknown",
  user_timeline: "unknown",
  recent_search: "unknown",
}

/** HTTP statuses that prove a capability is permanently unavailable for this plan. */
const UNAVAILABLE_STATUSES = new Set([401, 403, 404])

export function getCapabilityCache(): CapabilityCache {
  return { ...cache }
}

export function resetCapabilityCacheForTests(): void {
  cache.user_lookup = "unknown"
  cache.user_timeline = "unknown"
  cache.recent_search = "unknown"
}

export function observationalHealth(): {
  ok: boolean
  provider: string
  bearerConfigured: boolean
  capabilities: CapabilityCache
  lastError?: string
} {
  const bearerConfigured = Boolean(arieXBearerToken())
  if (!bearerConfigured) {
    return {
      ok: false,
      provider: "X",
      bearerConfigured: false,
      capabilities: {
        user_lookup: "unavailable",
        user_timeline: "unavailable",
        recent_search: "unavailable",
      },
      lastError: "missing_bearer",
    }
  }
  const caps = getCapabilityCache()
  const anyAvailable = Object.values(caps).some((s) => s === "available" || s === "unknown")
  return {
    ok: anyAvailable,
    provider: "X",
    bearerConfigured: true,
    capabilities: caps,
  }
}

/**
 * Record outcome of a real API call.
 * Transient → unknown; explicit auth/forbidden → unavailable; success → available.
 */
export function recordCapabilityResult(
  capability: DiscoveryProviderCapability,
  result: { ok: boolean; status?: number; rateLimited?: boolean; reason?: string },
): void {
  if (result.ok) {
    cache[capability] = "available"
    return
  }
  if (result.rateLimited || result.reason === "timeout" || result.reason === "rate_limited") {
    cache[capability] = "unknown"
    return
  }
  if (result.status != null && UNAVAILABLE_STATUSES.has(result.status)) {
    cache[capability] = "unavailable"
    return
  }
  if (result.status != null && result.status >= 500) {
    cache[capability] = "unknown"
    return
  }
  // Ambiguous failure — do not permanently disable
  cache[capability] = "unknown"
}

/** Whether we should attempt a capability (unknown or available — never skip on unknown). */
export function shouldAttemptCapability(capability: DiscoveryProviderCapability): boolean {
  const state = cache[capability]
  return state !== "unavailable"
}
