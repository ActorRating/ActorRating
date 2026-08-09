import { createHmac, randomBytes } from "crypto"
import { arieXBearerToken, arieXWriteCredentials } from "@/lib/arie/config"
import { arieLog } from "@/lib/arie/log"

/**
 * X / Twitter API — read helpers + OAuth 1.0a reply publish (Publisher only).
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

export function extractTweetId(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  if (/^\d{5,30}$/.test(s)) return s
  const m = s.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d{5,30})/i)
  return m?.[1] ?? null
}

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

function oauth1Header(opts: {
  method: string
  url: string
  apiKey: string
  apiSecret: string
  accessToken: string
  accessSecret: string
}): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: opts.apiKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: opts.accessToken,
    oauth_version: "1.0",
  }

  const paramString = Object.keys(oauth)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauth[k]!)}`)
    .join("&")

  const base = [
    opts.method.toUpperCase(),
    percentEncode(opts.url),
    percentEncode(paramString),
  ].join("&")

  const signingKey = `${percentEncode(opts.apiSecret)}&${percentEncode(opts.accessSecret)}`
  const signature = createHmac("sha1", signingKey).update(base).digest("base64")
  oauth.oauth_signature = signature

  const header =
    "OAuth " +
    Object.keys(oauth)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(oauth[k]!)}"`)
      .join(", ")
  return header
}

/**
 * Post a reply as the authenticated ActorRating user (OAuth 1.0a).
 * Only call from Publisher after kill-switch checks.
 */
export async function postReplyTweet(input: {
  text: string
  inReplyToTweetId: string
}): Promise<{ ok: true; tweetId: string } | { ok: false; reason: string; status?: number }> {
  const creds = arieXWriteCredentials()
  if (!creds) {
    await arieLog("warn", "x", "missing_write_creds", {})
    return { ok: false, reason: "missing_write_credentials" }
  }

  const text = input.text.trim()
  if (!text || text.length > 280) {
    return { ok: false, reason: "invalid_text_length" }
  }
  const replyTo = extractTweetId(input.inReplyToTweetId)
  if (!replyTo) return { ok: false, reason: "invalid_reply_to_id" }

  const url = "https://api.twitter.com/2/tweets"
  const authorization = oauth1Header({
    method: "POST",
    url,
    ...creds,
  })

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      reply: { in_reply_to_tweet_id: replyTo },
    }),
  })

  const bodyText = await res.text().catch(() => "")
  if (!res.ok) {
    let detail = ""
    try {
      const parsed = JSON.parse(bodyText) as {
        detail?: string
        title?: string
        errors?: Array<{ message?: string }>
      }
      detail =
        parsed.detail ||
        parsed.title ||
        parsed.errors?.map((e) => e.message).filter(Boolean).join("; ") ||
        ""
    } catch {
      detail = bodyText.slice(0, 200)
    }
    await arieLog("error", "x", "reply_failed", {
      status: res.status,
      body: bodyText.slice(0, 400),
      replyTo,
    })
    const suffix = detail ? `: ${detail}` : ""
    return { ok: false, reason: `x_http_${res.status}${suffix}`.slice(0, 300), status: res.status }
  }

  let tweetId = ""
  try {
    const data = JSON.parse(bodyText) as { data?: { id?: string } }
    tweetId = data.data?.id ?? ""
  } catch {
    return { ok: false, reason: "invalid_x_response" }
  }
  if (!tweetId) return { ok: false, reason: "missing_tweet_id" }

  await arieLog("info", "x", "reply_posted", { tweetId, replyTo })
  return { ok: true, tweetId }
}
