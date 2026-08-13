/**
 * X Discovery Provider — read/search only via X API v2.
 * Auth: OAuth 1.0a user-context (preferred) or optional Bearer.
 * Health is observational (no live probes).
 */

import { arieLog } from "@/lib/arie/log"
import {
  observationalHealth,
  shouldAttemptCapability,
} from "@/lib/arie/discovery/capabilities"
import { normalizeXTimeline, withKeywordReplyFilter } from "@/lib/arie/discovery/normalize"
import type {
  AccountSourceRequest,
  DiscoveryFetchResult,
  DiscoveryProvider,
  DiscoveryProviderHealth,
  KeywordSourceRequest,
} from "@/lib/arie/discovery/types"
import {
  xFetchUserTimeline,
  xLookupUserByUsername,
  xSearchRecent,
} from "@/lib/arie/discovery/x-read"

function isoStartTime(lookbackMinutes?: number): string | null {
  if (!lookbackMinutes || lookbackMinutes <= 0) return null
  const d = new Date(Date.now() - lookbackMinutes * 60_000)
  return d.toISOString()
}

export class XDiscoveryProvider implements DiscoveryProvider {
  sourceName(): string {
    return "X"
  }

  /** Observational only — never hits X API. */
  async health(): Promise<DiscoveryProviderHealth> {
    const h = observationalHealth()
    return {
      ok: h.ok,
      provider: h.provider,
      authConfigured: h.authConfigured,
      authMethod: h.authMethod,
      oauth1Configured: h.oauth1Configured,
      bearerConfigured: h.bearerConfigured,
      // Map capability states to booleans for older UI: unavailable=false, else true (attemptable)
      capabilities: {
        user_lookup: h.capabilities.user_lookup !== "unavailable",
        user_timeline: h.capabilities.user_timeline !== "unavailable",
        recent_search: h.capabilities.recent_search !== "unavailable",
      },
      lastError: h.lastError,
    }
  }

  async getPostsFromAccounts(input: AccountSourceRequest): Promise<DiscoveryFetchResult> {
    const handle = input.handle.replace(/^@/, "").trim()
    if (!handle) return { ok: false, reason: "handle_required" }

    if (!shouldAttemptCapability("user_lookup") && !input.authorId) {
      return { ok: false, reason: "user_lookup_unavailable", status: 403 }
    }
    if (!shouldAttemptCapability("user_timeline")) {
      return { ok: false, reason: "user_timeline_unavailable", status: 403 }
    }

    let userId = input.authorId ?? null
    if (!userId) {
      const lookup = await xLookupUserByUsername(handle)
      if (!lookup.ok) {
        return {
          ok: false,
          reason: lookup.reason,
          status: lookup.status,
          rateLimited: lookup.rateLimited,
        }
      }
      userId = lookup.data.data?.id ?? null
      if (!userId) return { ok: false, reason: "user_not_found" }
    }

    const timeline = await xFetchUserTimeline({
      userId,
      maxResults: input.maxResults ?? 10,
      remainingBudget: input.maxResults,
      sinceId: input.sinceId ?? null,
      startTime: isoStartTime(input.lookbackMinutes),
    })

    if (!timeline.ok) {
      return {
        ok: false,
        reason: timeline.reason,
        status: timeline.status,
        rateLimited: timeline.rateLimited,
      }
    }

    const tweets = timeline.data.data ?? []
    if (!tweets.length) {
      return { ok: true, posts: [] }
    }

    const posts = normalizeXTimeline({
      tweets,
      users: timeline.data.includes?.users,
      discoveryMethod: "account_timeline",
      fallbackHandle: handle,
    })

    await arieLog("info", "discovery", "x_account_fetch", {
      handle,
      count: posts.length,
      rateLimitRemaining: timeline.rateLimitRemaining,
    })

    return { ok: true, posts }
  }

  async searchPosts(input: KeywordSourceRequest): Promise<DiscoveryFetchResult> {
    const query = withKeywordReplyFilter(input.query.trim())
    if (!query) return { ok: false, reason: "query_required" }

    if (!shouldAttemptCapability("recent_search")) {
      return { ok: false, reason: "recent_search_unavailable", status: 403 }
    }

    const search = await xSearchRecent({
      query,
      maxResults: input.maxResults ?? 10,
      remainingBudget: input.maxResults,
      startTime: isoStartTime(input.lookbackMinutes),
    })

    if (!search.ok) {
      return {
        ok: false,
        reason: search.reason,
        status: search.status,
        rateLimited: search.rateLimited,
      }
    }

    const tweets = search.data.data ?? []
    if (!tweets.length) {
      return { ok: true, posts: [] }
    }

    const posts = normalizeXTimeline({
      tweets,
      users: search.data.includes?.users,
      discoveryMethod: "keyword_search",
    })

    await arieLog("info", "discovery", "x_search_fetch", {
      query,
      count: posts.length,
      rateLimitRemaining: search.rateLimitRemaining,
    })

    return { ok: true, posts }
  }
}

let cachedProvider: XDiscoveryProvider | null = null

export function getXDiscoveryProvider(): XDiscoveryProvider {
  if (!cachedProvider) cachedProvider = new XDiscoveryProvider()
  return cachedProvider
}
