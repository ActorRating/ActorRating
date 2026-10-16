import { NextResponse } from "next/server"
import {
  applyFirstTouchAttributionCookies,
  applyPageviewAttributionCookies,
  campaignCookieToSet,
  fillEmptyCampaignCookie,
} from "@/lib/tracking/attribution-cookies"
import { AR_SRC_MAX_AGE_SEC } from "@/lib/tracking/source"

function setCookie(response: NextResponse, name: string): string {
  return response.headers.getSetCookie().find((cookie) => cookie.startsWith(`${name}=`)) ?? ""
}

describe("campaign cookie fill", () => {
  it("returns the landing campaign only when the cookie is empty", () => {
    expect(campaignCookieToSet(" actorrating_pmax_test ", null)).toBe("actorrating_pmax_test")
    expect(campaignCookieToSet("new", "old")).toBeNull()
    expect(campaignCookieToSet("   ", null)).toBeNull()
    expect(campaignCookieToSet("x".repeat(250), null)).toHaveLength(200)
  })

  it("sets the campaign cookie without a recognized source and without ar_src", () => {
    const response = new NextResponse(null, { status: 204 })
    applyPageviewAttributionCookies(response, {
      attribution: null,
      utmCampaign: "actorrating_pmax_test",
      existingCampaign: null,
    })

    expect(response.cookies.get("ar_utm_campaign")?.value).toBe("actorrating_pmax_test")
    expect(response.cookies.get("ar_src")).toBeUndefined()
  })

  it("sets an empty campaign cookie even when ar_src is already set", () => {
    const response = new NextResponse(null, { status: 204 })
    applyPageviewAttributionCookies(response, {
      attribution: {
        source: "google",
        utmMedium: "cpc",
        utmCampaign: "actorrating_pmax_test",
        utmContent: null,
        existingSource: "google",
      },
      utmCampaign: "actorrating_pmax_test",
      existingCampaign: null,
    })

    expect(response.cookies.get("ar_src")).toBeUndefined()
    expect(response.cookies.get("ar_utm_campaign")?.value).toBe("actorrating_pmax_test")
  })

  it("does not replace an existing campaign cookie", () => {
    const response = new NextResponse(null, { status: 204 })
    applyFirstTouchAttributionCookies(response, {
      source: "google",
      utmMedium: "cpc",
      utmCampaign: "new_campaign",
      utmContent: null,
      existingCampaign: "actorrating_pmax_test",
    })
    fillEmptyCampaignCookie(response, {
      utmCampaign: "new_campaign",
      existingCampaign: "actorrating_pmax_test",
    })

    expect(response.cookies.get("ar_src")?.value).toBe("google")
    expect(response.cookies.get("ar_utm_campaign")).toBeUndefined()
  })

  it("keeps the first campaign when first-touch source and campaign arrive together", () => {
    const response = new NextResponse(null, { status: 204 })
    applyPageviewAttributionCookies(response, {
      attribution: {
        source: "google",
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "actorrating_pmax_test",
        utmContent: null,
      },
      utmCampaign: "actorrating_pmax_test",
      existingCampaign: null,
    })

    const campaignHeaders = response.headers
      .getSetCookie()
      .filter((cookie) => cookie.startsWith("ar_utm_campaign="))
    expect(campaignHeaders).toHaveLength(1)
    expect(response.cookies.get("ar_src")?.value).toBe("google")
    expect(response.cookies.get("ar_utm_campaign")?.value).toBe("actorrating_pmax_test")
  })

  it("uses the existing UTM cookie flags and leaves ar_src httpOnly", () => {
    const response = new NextResponse(null, { status: 204 })
    applyFirstTouchAttributionCookies(response, {
      source: "google",
      utmMedium: "cpc",
      utmCampaign: null,
      utmContent: null,
    })
    fillEmptyCampaignCookie(response, {
      utmCampaign: "actorrating_pmax_test",
      existingCampaign: null,
    })

    const campaign = setCookie(response, "ar_utm_campaign")
    const medium = setCookie(response, "ar_utm_medium")
    const source = setCookie(response, "ar_src")

    expect(campaign).toContain("Path=/")
    expect(campaign).toContain("SameSite=lax")
    expect(campaign).toContain(`Max-Age=${AR_SRC_MAX_AGE_SEC}`)
    expect(campaign.toLowerCase()).not.toContain("httponly")
    expect(medium.toLowerCase()).not.toContain("httponly")
    expect(source.toLowerCase()).toContain("httponly")
    expect(campaign.includes("Secure")).toBe(medium.includes("Secure"))
  })
})
