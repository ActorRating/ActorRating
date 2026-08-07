import { arieXBearerToken } from "@/lib/arie/config"
import { arieLog } from "@/lib/arie/log"

/**
 * Sprint 1 X API client stub — read helpers only (no publish until Sprint 3).
 */
export async function fetchTweetById(tweetId: string): Promise<
  | { ok: true; data: unknown }
  | { ok: false; reason: string }
> {
  const token = arieXBearerToken()
  if (!token) {
    await arieLog("warn", "x", "missing_bearer", { tweetId })
    return { ok: false, reason: "missing_bearer" }
  }

  const url = new URL(`https://api.twitter.com/2/tweets/${encodeURIComponent(tweetId)}`)
  url.searchParams.set("tweet.fields", "author_id,created_at,lang,public_metrics,text")

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    await arieLog("error", "x", "tweet_fetch_failed", { tweetId, status: res.status })
    return { ok: false, reason: `x_http_${res.status}` }
  }
  return { ok: true, data: await res.json() }
}
