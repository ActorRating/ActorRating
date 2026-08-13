/**
 * X API v2 read helpers — no write operations.
 * Auth: OAuth 1.0a user-context (existing ARIE_X_* credentials) or optional Bearer.
 * No live capability probes.
 */

import { arieXBearerToken, arieXWriteCredentials } from "@/lib/arie/config"
import { arieLog } from "@/lib/arie/log"
import { recordCapabilityResult } from "@/lib/arie/discovery/capabilities"
import { buildOAuth1AuthorizationHeader } from "@/lib/arie/x-oauth1"

export type XReadResponse<T> =
  | {
      ok: true
      data: T
      status: number
      rateLimitRemaining: number | null
      rateLimitReset: number | null
    }
  | {
      ok: false
      reason: string
      status?: number
      rateLimited?: boolean
      body?: string
    }

export type XReadAuthHeader =
  | { ok: true; authorization: string; method: "oauth1_user_context" | "bearer" }
  | { ok: false; reason: "missing_auth" }

/**
 * Build a read Authorization header. Prefers OAuth 1.0a user-context.
 * Never returns credential values.
 */
export function buildXReadAuthorization(input: {
  method: string
  url: string
  query?: Record<string, string>
}): XReadAuthHeader {
  const creds = arieXWriteCredentials()
  if (creds) {
    return {
      ok: true,
      method: "oauth1_user_context",
      authorization: buildOAuth1AuthorizationHeader({
        method: input.method,
        url: input.url,
        query: input.query,
        creds,
      }),
    }
  }
  const token = arieXBearerToken()
  if (token) {
    return { ok: true, method: "bearer", authorization: `Bearer ${token}` }
  }
  return { ok: false, reason: "missing_auth" }
}

function parseRateLimit(res: Response): {
  remaining: number | null
  reset: number | null
} {
  const remaining = res.headers.get("x-rate-limit-remaining")
  const reset = res.headers.get("x-rate-limit-reset")
  return {
    remaining: remaining != null ? Number(remaining) : null,
    reset: reset != null ? Number(reset) : null,
  }
}

export async function xReadGet<T>(
  path: string,
  searchParams?: Record<string, string>,
): Promise<XReadResponse<T>> {
  const url = new URL(`https://api.twitter.com/2${path}`)
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v)
    }
  }

  const query: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    query[key] = value
  })

  const auth = buildXReadAuthorization({
    method: "GET",
    url: `${url.origin}${url.pathname}`,
    query,
  })
  if (!auth.ok) {
    return { ok: false, reason: "missing_auth" }
  }

  let res: Response
  try {
    res = await fetch(url, {
      headers: { Authorization: auth.authorization },
      signal: AbortSignal.timeout(25_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await arieLog("error", "discovery", "x_fetch_timeout", { path, error: msg })
    return { ok: false, reason: "timeout" }
  }

  const { remaining, reset } = parseRateLimit(res)
  const bodyText = await res.text().catch(() => "")

  if (res.status === 429) {
    await arieLog("warn", "discovery", "x_rate_limited", { path, remaining, reset })
    return {
      ok: false,
      reason: "rate_limited",
      status: 429,
      rateLimited: true,
      body: bodyText.slice(0, 300),
    }
  }

  if (!res.ok) {
    await arieLog("error", "discovery", "x_read_failed", {
      path,
      status: res.status,
      body: bodyText.slice(0, 300),
    })
    return {
      ok: false,
      reason: `x_http_${res.status}`,
      status: res.status,
      body: bodyText.slice(0, 300),
    }
  }

  try {
    const data = JSON.parse(bodyText) as T
    return {
      ok: true,
      data,
      status: res.status,
      rateLimitRemaining: remaining,
      rateLimitReset: reset,
    }
  } catch {
    return { ok: false, reason: "invalid_json", status: res.status, body: bodyText.slice(0, 300) }
  }
}

/** @deprecated Use xReadGet — kept as alias for existing imports. */
export const xBearerGet = xReadGet

export type XTweetFields = {
  id: string
  text: string
  author_id?: string
  created_at?: string
  lang?: string
  public_metrics?: {
    retweet_count?: number
    reply_count?: number
    like_count?: number
    quote_count?: number
    impression_count?: number
    bookmark_count?: number
  }
}

export type XUser = {
  id: string
  username: string
  name?: string
}

export type XTimelineResponse = {
  data?: XTweetFields[]
  includes?: { users?: XUser[] }
  meta?: { newest_id?: string; result_count?: number; next_token?: string }
  errors?: Array<{ title?: string; detail?: string; status?: number }>
}

export type XSearchResponse = XTimelineResponse

export type XUserLookupResponse = {
  data?: XUser
  errors?: Array<{ title?: string; detail?: string; status?: number }>
}

const TWEET_FIELDS = "author_id,created_at,lang,public_metrics,text"
const USER_FIELDS = "username"

/** Clamp max_results to X API valid range and remaining discovery budget. */
export function clampTimelineMaxResults(requested: number, remainingBudget?: number): number {
  const budget = remainingBudget != null ? Math.max(1, remainingBudget) : requested
  const capped = Math.min(requested, budget)
  // X user timeline requires 5–100
  return Math.min(100, Math.max(5, capped))
}

export function clampSearchMaxResults(requested: number, remainingBudget?: number): number {
  const budget = remainingBudget != null ? Math.max(1, remainingBudget) : requested
  const capped = Math.min(requested, budget)
  // X recent search requires 10–100
  return Math.min(100, Math.max(10, capped))
}

/** Build timeline query params (exported for tests). */
export function buildUserTimelineParams(input: {
  maxResults?: number
  remainingBudget?: number
  sinceId?: string | null
  startTime?: string | null
}): Record<string, string> {
  const params: Record<string, string> = {
    max_results: String(clampTimelineMaxResults(input.maxResults ?? 10, input.remainingBudget)),
    "tweet.fields": TWEET_FIELDS,
    expansions: "author_id",
    "user.fields": USER_FIELDS,
    // Original posts only — discovery looks for events/news, not reply threads.
    exclude: "replies,retweets",
  }
  if (input.sinceId) params.since_id = input.sinceId
  if (input.startTime) params.start_time = input.startTime
  return params
}

export async function xLookupUserByUsername(username: string) {
  const handle = username.replace(/^@/, "").trim()
  const result = await xReadGet<XUserLookupResponse>(
    `/users/by/username/${encodeURIComponent(handle)}`,
    { "user.fields": USER_FIELDS },
  )
  recordCapabilityResult("user_lookup", {
    ok: result.ok,
    status: result.ok ? result.status : result.status,
    rateLimited: !result.ok && result.rateLimited,
    reason: result.ok ? undefined : result.reason,
  })
  return result
}

export async function xFetchUserTimeline(input: {
  userId: string
  maxResults?: number
  remainingBudget?: number
  sinceId?: string | null
  startTime?: string | null
}) {
  const params = buildUserTimelineParams(input)
  const result = await xReadGet<XTimelineResponse>(
    `/users/${encodeURIComponent(input.userId)}/tweets`,
    params,
  )
  recordCapabilityResult("user_timeline", {
    ok: result.ok,
    status: result.ok ? result.status : result.status,
    rateLimited: !result.ok && result.rateLimited,
    reason: result.ok ? undefined : result.reason,
  })
  return result
}

export async function xSearchRecent(input: {
  query: string
  maxResults?: number
  remainingBudget?: number
  startTime?: string | null
}) {
  const params: Record<string, string> = {
    query: input.query,
    max_results: String(clampSearchMaxResults(input.maxResults ?? 10, input.remainingBudget)),
    "tweet.fields": TWEET_FIELDS,
    expansions: "author_id",
    "user.fields": USER_FIELDS,
  }
  if (input.startTime) params.start_time = input.startTime

  const result = await xReadGet<XSearchResponse>("/tweets/search/recent", params)
  recordCapabilityResult("recent_search", {
    ok: result.ok,
    status: result.ok ? result.status : result.status,
    rateLimited: !result.ok && result.rateLimited,
    reason: result.ok ? undefined : result.reason,
  })
  return result
}
