/**
 * OAuth 1.0a user-context signing for Discovery reads (no live X, no real secrets).
 */

import { buildOAuth1AuthorizationHeader, percentEncodeOAuth } from "@/lib/arie/x-oauth1"
import { buildXReadAuthorization, xLookupUserByUsername } from "@/lib/arie/discovery/x-read"
import {
  arieOriginalPublishEnabled,
  ariePublishEnabled,
  arieXReadAuthConfigured,
  arieXReadAuthMethod,
} from "@/lib/arie/config"
import { observationalHealth, resetCapabilityCacheForTests } from "@/lib/arie/discovery/capabilities"

const TEST_CREDS = {
  apiKey: "test-consumer-key",
  apiSecret: "test-consumer-secret",
  accessToken: "test-access-token",
  accessSecret: "test-access-secret",
}

describe("OAuth 1.0a GET signing", () => {
  it("produces an OAuth header without leaking secrets", () => {
    const header = buildOAuth1AuthorizationHeader({
      method: "GET",
      url: "https://api.twitter.com/2/users/by/username/deadline",
      query: { "user.fields": "username" },
      creds: TEST_CREDS,
      nonce: "fixednonce",
      timestamp: "1700000000",
    })
    expect(header.startsWith("OAuth ")).toBe(true)
    expect(header).toContain("oauth_signature=")
    expect(header).not.toContain(TEST_CREDS.apiSecret)
    expect(header).not.toContain(TEST_CREDS.accessSecret)
    expect(header).not.toContain("Bearer ")
  })

  it("includes query params in the signature (changing query changes signature)", () => {
    const a = buildOAuth1AuthorizationHeader({
      method: "GET",
      url: "https://api.twitter.com/2/users/123/tweets",
      query: { exclude: "replies,retweets", max_results: "10" },
      creds: TEST_CREDS,
      nonce: "n",
      timestamp: "1",
    })
    const b = buildOAuth1AuthorizationHeader({
      method: "GET",
      url: "https://api.twitter.com/2/users/123/tweets",
      query: { exclude: "replies,retweets", max_results: "20" },
      creds: TEST_CREDS,
      nonce: "n",
      timestamp: "1",
    })
    const sig = (h: string) => h.match(/oauth_signature="([^"]+)"/)?.[1]
    expect(sig(a)).toBeTruthy()
    expect(sig(a)).not.toBe(sig(b))
  })

  it("is deterministic for the same nonce/timestamp/query", () => {
    const opts = {
      method: "GET" as const,
      url: "https://api.twitter.com/2/tweets/search/recent",
      query: { query: "casting lang:en", max_results: "10" },
      creds: TEST_CREDS,
      nonce: "abc",
      timestamp: "1700000000",
    }
    expect(buildOAuth1AuthorizationHeader(opts)).toBe(buildOAuth1AuthorizationHeader(opts))
  })

  it("matches RFC 5849 / X documented parameter string and signature base string", () => {
    const oauth = {
      oauth_consumer_key: "xvz1evFS4wEEPTGEFPHBog",
      oauth_nonce: "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg",
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: "1318622958",
      oauth_token: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
      oauth_version: "1.0",
    }
    const query = {
      include_entities: "true",
      status: "Hello Ladies + Gentlemen, a signed OAuth request!",
    }
    const signatureParams = { ...oauth, ...query }
    const paramString = Object.keys(signatureParams)
      .sort()
      .map((k) => `${percentEncodeOAuth(k)}=${percentEncodeOAuth(signatureParams[k]!)}`)
      .join("&")
    const base = [
      "POST",
      percentEncodeOAuth("https://api.twitter.com/1.1/statuses/update.json"),
      percentEncodeOAuth(paramString),
    ].join("&")

    expect(paramString).toBe(
      "include_entities=true&oauth_consumer_key=xvz1evFS4wEEPTGEFPHBog&oauth_nonce=kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg&oauth_signature_method=HMAC-SHA1&oauth_timestamp=1318622958&oauth_token=370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb&oauth_version=1.0&status=Hello%20Ladies%20%2B%20Gentlemen%2C%20a%20signed%20OAuth%20request%21",
    )
    expect(base).toBe(
      "POST&https%3A%2F%2Fapi.twitter.com%2F1.1%2Fstatuses%2Fupdate.json&include_entities%3Dtrue%26oauth_consumer_key%3Dxvz1evFS4wEEPTGEFPHBog%26oauth_nonce%3DkYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D1318622958%26oauth_token%3D370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb%26oauth_version%3D1.0%26status%3DHello%2520Ladies%2520%252B%2520Gentlemen%252C%2520a%2520signed%2520OAuth%2520request%2521",
    )

    const header = buildOAuth1AuthorizationHeader({
      method: "POST",
      url: "https://api.twitter.com/1.1/statuses/update.json",
      query,
      creds: {
        apiKey: "xvz1evFS4wEEPTGEFPHBog",
        apiSecret: "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw",
        accessToken: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
        accessSecret: "LswwdoUk02u2P3teSBMTyLtzt0OW5f9ClK97hYhQz",
      },
      nonce: "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg",
      timestamp: "1318622958",
    })
    const sig = decodeURIComponent(header.match(/oauth_signature="([^"]+)"/)?.[1] ?? "")
    // HMAC of the documented base string (independent Node/Python agreement).
    expect(sig).toBe("PgvRuMQ8bLuOP5AVV8H/oS4FoEw=")
  })
})

describe("Discovery read auth selection", () => {
  const saved: Record<string, string | undefined> = {}
  const keys = [
    "ARIE_X_API_KEY",
    "ARIE_X_API_SECRET",
    "ARIE_X_ACCESS_TOKEN",
    "ARIE_X_ACCESS_SECRET",
    "ARIE_X_BEARER_TOKEN",
    "X_BEARER_TOKEN",
    "X_API_KEY",
    "X_API_SECRET",
    "X_ACCESS_TOKEN",
    "X_ACCESS_SECRET",
    "X_ACCESS_TOKEN_SECRET",
  ]

  beforeEach(() => {
    for (const k of keys) {
      saved[k] = process.env[k]
      delete process.env[k]
    }
    resetCapabilityCacheForTests()
  })

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })

  it("prefers OAuth 1.0a when the four user-context env vars are set and Bearer is absent", () => {
    process.env.ARIE_X_API_KEY = TEST_CREDS.apiKey
    process.env.ARIE_X_API_SECRET = TEST_CREDS.apiSecret
    process.env.ARIE_X_ACCESS_TOKEN = TEST_CREDS.accessToken
    process.env.ARIE_X_ACCESS_SECRET = TEST_CREDS.accessSecret
    expect(arieXReadAuthMethod()).toBe("oauth1_user_context")
    expect(arieXReadAuthConfigured()).toBe(true)

    const auth = buildXReadAuthorization({
      method: "GET",
      url: "https://api.twitter.com/2/users/by/username/x",
      query: { "user.fields": "username" },
    })
    expect(auth.ok).toBe(true)
    if (auth.ok) {
      expect(auth.method).toBe("oauth1_user_context")
      expect(auth.authorization.startsWith("OAuth ")).toBe(true)
      expect(auth.authorization).not.toContain(TEST_CREDS.apiSecret)
      expect(auth.authorization).not.toContain(TEST_CREDS.accessSecret)
      expect(auth.authorization).not.toMatch(/^Bearer /)
    }
  })

  it("falls back to Bearer only when OAuth 1.0a is not configured", () => {
    process.env.ARIE_X_BEARER_TOKEN = "app-only-token"
    expect(arieXReadAuthMethod()).toBe("bearer")
    const auth = buildXReadAuthorization({
      method: "GET",
      url: "https://api.twitter.com/2/users/by/username/x",
    })
    expect(auth.ok).toBe(true)
    if (auth.ok) {
      expect(auth.method).toBe("bearer")
      expect(auth.authorization).toBe("Bearer app-only-token")
    }
  })

  it("returns missing_auth when neither method is configured", () => {
    expect(arieXReadAuthMethod()).toBe("none")
    expect(arieXReadAuthConfigured()).toBe(false)
    const auth = buildXReadAuthorization({
      method: "GET",
      url: "https://api.twitter.com/2/users/by/username/x",
    })
    expect(auth).toEqual({ ok: false, reason: "missing_auth" })
  })

  it("observational health: OAuth 1.0a configured → auth yes, capabilities unknown, not missing_bearer", () => {
    process.env.ARIE_X_API_KEY = TEST_CREDS.apiKey
    process.env.ARIE_X_API_SECRET = TEST_CREDS.apiSecret
    process.env.ARIE_X_ACCESS_TOKEN = TEST_CREDS.accessToken
    process.env.ARIE_X_ACCESS_SECRET = TEST_CREDS.accessSecret
    const h = observationalHealth()
    expect(h.authConfigured).toBe(true)
    expect(h.authMethod).toBe("oauth1_user_context")
    expect(h.oauth1Configured).toBe(true)
    expect(h.bearerConfigured).toBe(false)
    expect(h.ok).toBe(true)
    expect(h.lastError).toBeUndefined()
    expect(h.capabilities.user_lookup).toBe("unknown")
    expect(h.capabilities.user_timeline).toBe("unknown")
    expect(h.capabilities.recent_search).toBe("unknown")
  })

  it("observational health: no auth → auth no, capabilities unavailable", () => {
    const h = observationalHealth()
    expect(h.authConfigured).toBe(false)
    expect(h.lastError).toBe("missing_auth")
    expect(h.capabilities.user_lookup).toBe("unavailable")
  })

  it("does not enable publishing flags", () => {
    process.env.ARIE_X_API_KEY = TEST_CREDS.apiKey
    process.env.ARIE_X_API_SECRET = TEST_CREDS.apiSecret
    process.env.ARIE_X_ACCESS_TOKEN = TEST_CREDS.accessToken
    process.env.ARIE_X_ACCESS_SECRET = TEST_CREDS.accessSecret
    expect(ariePublishEnabled()).toBe(false)
    expect(arieOriginalPublishEnabled()).toBe(false)
  })

  it("does not fall back to Bearer after an OAuth 1.0a 401", async () => {
    process.env.ARIE_X_API_KEY = TEST_CREDS.apiKey
    process.env.ARIE_X_API_SECRET = TEST_CREDS.apiSecret
    process.env.ARIE_X_ACCESS_TOKEN = TEST_CREDS.accessToken
    process.env.ARIE_X_ACCESS_SECRET = TEST_CREDS.accessSecret
    process.env.ARIE_X_BEARER_TOKEN = "should-not-be-used"

    const originalFetch = global.fetch
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => null },
      text: async () => JSON.stringify({ title: "Unauthorized" }),
    })
    global.fetch = fetchMock as unknown as typeof fetch
    try {
      const res = await xLookupUserByUsername("deadline")
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.status).toBe(401)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const init = fetchMock.mock.calls[0]?.[1] as { headers?: { Authorization?: string } }
      const authorization = init?.headers?.Authorization ?? ""
      expect(authorization.startsWith("OAuth ")).toBe(true)
      expect(authorization).not.toContain("should-not-be-used")
      expect(authorization).not.toMatch(/^Bearer /)
    } finally {
      global.fetch = originalFetch
    }
  })
})
