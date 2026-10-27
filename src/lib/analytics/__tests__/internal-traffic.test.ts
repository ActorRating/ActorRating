/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import {
  ANALYTICS_TRACK_OVERRIDE_HEADER,
  hasAnalyticsTrackOverride,
  hasInternalTrafficCookie,
  INTERNAL_TRAFFIC_COOKIE,
  INTERNAL_TRAFFIC_COOKIE_VALUE,
  isAdminAnalyticsEmail,
  shouldSkipAnalyticsStorage,
} from "@/lib/analytics/internal-traffic"
import {
  analyticsTrackOverrideHeaders,
  analyticsTrackOverrideQuery,
  pageHasAnalyticsTrackOverride,
} from "@/lib/analytics/pageview-client"

function req(
  path: string,
  init?: {
    cookie?: string
    headers?: Record<string, string>
  },
): NextRequest {
  const headers = new Headers(init?.headers)
  if (init?.cookie) headers.set("cookie", init.cookie)
  return new NextRequest(`https://actorrating.com${path}`, { headers })
}

describe("internal traffic exclusion", () => {
  const prevAdmin = process.env.ADMIN_EMAIL

  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@actorrating.com"
  })

  afterAll(() => {
    if (prevAdmin === undefined) delete process.env.ADMIN_EMAIL
    else process.env.ADMIN_EMAIL = prevAdmin
  })

  it("detects ar_internal cookie", () => {
    expect(hasInternalTrafficCookie(req("/"))).toBe(false)
    expect(
      hasInternalTrafficCookie(
        req("/", {
          cookie: `${INTERNAL_TRAFFIC_COOKIE}=${INTERNAL_TRAFFIC_COOKIE_VALUE}`,
        }),
      ),
    ).toBe(true)
  })

  it("matches ADMIN_EMAIL case-insensitively", () => {
    expect(isAdminAnalyticsEmail("admin@actorrating.com")).toBe(true)
    expect(isAdminAnalyticsEmail("Admin@ActorRating.com")).toBe(true)
    expect(isAdminAnalyticsEmail("other@example.com")).toBe(false)
    expect(isAdminAnalyticsEmail(null)).toBe(false)
  })

  it("skips storage when cookie is present", () => {
    const r = req("/api/analytics/pageview", {
      cookie: `${INTERNAL_TRAFFIC_COOKIE}=${INTERNAL_TRAFFIC_COOKIE_VALUE}`,
    })
    expect(shouldSkipAnalyticsStorage(r, null)).toBe(true)
  })

  it("skips storage for admin email without cookie", () => {
    expect(
      shouldSkipAnalyticsStorage(req("/api/analytics/event"), "admin@actorrating.com"),
    ).toBe(true)
  })

  it("does not skip for a normal user without cookie", () => {
    expect(
      shouldSkipAnalyticsStorage(req("/api/analytics/pageview"), "user@example.com"),
    ).toBe(false)
  })

  it("does not skip when ?ar_track=1 override is present", () => {
    const withCookie = req("/api/analytics/pageview?ar_track=1", {
      cookie: `${INTERNAL_TRAFFIC_COOKIE}=${INTERNAL_TRAFFIC_COOKIE_VALUE}`,
    })
    expect(shouldSkipAnalyticsStorage(withCookie, "admin@actorrating.com")).toBe(
      false,
    )
  })

  it("does not skip when x-ar-track: 1 header override is present", () => {
    const withHeader = req("/api/analytics/dwell", {
      cookie: `${INTERNAL_TRAFFIC_COOKIE}=${INTERNAL_TRAFFIC_COOKIE_VALUE}`,
      headers: { [ANALYTICS_TRACK_OVERRIDE_HEADER]: "1" },
    })
    expect(hasAnalyticsTrackOverride(withHeader)).toBe(true)
    expect(shouldSkipAnalyticsStorage(withHeader, "admin@actorrating.com")).toBe(
      false,
    )
  })
})

describe("pageview-client track override helpers", () => {
  const originalWindow = global.window

  afterEach(() => {
    // @ts-expect-error test cleanup
    global.window = originalWindow
  })

  it("returns empty override when window is undefined (SSR)", () => {
    // @ts-expect-error simulate SSR
    delete global.window
    expect(pageHasAnalyticsTrackOverride()).toBe(false)
    expect(analyticsTrackOverrideQuery()).toBe("")
    expect(analyticsTrackOverrideHeaders()).toEqual({})
  })
})
