/**
 * OAuth 1.0a user-context signing for X API v2.
 *
 * Used by Discovery GET/read requests. Publisher keeps its own signer in x.ts
 * and is not modified here.
 *
 * Query/body parameters MUST be included in the signature base string for GET
 * requests (RFC 5849). The Authorization header contains only oauth_* params.
 */

import { createHmac, randomBytes } from "crypto"

export type OAuth1UserContextCredentials = {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessSecret: string
}

export function percentEncodeOAuth(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

export function buildOAuth1AuthorizationHeader(input: {
  method: string
  /** Base URL with no query string (e.g. https://api.twitter.com/2/users/by/username/x). */
  url: string
  query?: Record<string, string>
  creds: OAuth1UserContextCredentials
  nonce?: string
  timestamp?: string
}): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: input.creds.apiKey,
    oauth_nonce: input.nonce ?? randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: input.timestamp ?? String(Math.floor(Date.now() / 1000)),
    oauth_token: input.creds.accessToken,
    oauth_version: "1.0",
  }

  const signatureParams: Record<string, string> = { ...oauth }
  if (input.query) {
    for (const [k, v] of Object.entries(input.query)) {
      signatureParams[k] = v
    }
  }

  const paramString = Object.keys(signatureParams)
    .sort()
    .map((k) => `${percentEncodeOAuth(k)}=${percentEncodeOAuth(signatureParams[k]!)}`)
    .join("&")

  const base = [
    input.method.toUpperCase(),
    percentEncodeOAuth(input.url),
    percentEncodeOAuth(paramString),
  ].join("&")

  const signingKey = `${percentEncodeOAuth(input.creds.apiSecret)}&${percentEncodeOAuth(input.creds.accessSecret)}`
  oauth.oauth_signature = createHmac("sha1", signingKey).update(base).digest("base64")

  return (
    "OAuth " +
    Object.keys(oauth)
      .sort()
      .map((k) => `${percentEncodeOAuth(k)}="${percentEncodeOAuth(oauth[k]!)}"`)
      .join(", ")
  )
}
