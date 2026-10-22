/**
 * @jest-environment node
 */

import { buildTrackedUrl } from "@/lib/tracking/tracked-url"

describe("buildTrackedUrl", () => {
  it("appends UTM params to an absolute URL", () => {
    expect(
      buildTrackedUrl(
        "/movies/the-odyssey-2026/best-performances",
        {
          utm_source: "x",
          utm_medium: "reply",
          utm_campaign: "odyssey_hub",
        },
        "https://actorrating.com",
      ),
    ).toBe(
      "https://actorrating.com/movies/the-odyssey-2026/best-performances?utm_source=x&utm_medium=reply&utm_campaign=odyssey_hub",
    )
  })

  it("omits empty params", () => {
    expect(
      buildTrackedUrl("/about", { utm_source: "tiktok", utm_medium: "  " }, "https://actorrating.com"),
    ).toBe("https://actorrating.com/about?utm_source=tiktok")
  })
})
