import { getAmazonAffiliateUrl, sanitizeAmazonAffiliateUrl } from "@/lib/amazon-affiliate"

describe("sanitizeAmazonAffiliateUrl", () => {
  it("keeps https Amazon and SiteStripe URLs", () => {
    expect(
      sanitizeAmazonAffiliateUrl("https://www.amazon.com/dp/B001?tag=example-20"),
    ).toBe("https://www.amazon.com/dp/B001?tag=example-20")
    expect(sanitizeAmazonAffiliateUrl("https://amzn.to/abc123")).toBe("https://amzn.to/abc123")
    expect(
      sanitizeAmazonAffiliateUrl("https://www.amazon.com.tr/dp/B002"),
    ).toBe("https://www.amazon.com.tr/dp/B002")
  })

  it("rejects non-Amazon and non-https URLs", () => {
    expect(sanitizeAmazonAffiliateUrl("https://evil.com/amazon")).toBeNull()
    expect(sanitizeAmazonAffiliateUrl("http://www.amazon.com/dp/B001")).toBeNull()
    expect(sanitizeAmazonAffiliateUrl("javascript:alert(1)")).toBeNull()
    expect(sanitizeAmazonAffiliateUrl("")).toBeNull()
    expect(sanitizeAmazonAffiliateUrl(null)).toBeNull()
  })
})

describe("getAmazonAffiliateUrl", () => {
  it("returns null when no slug is configured", () => {
    expect(getAmazonAffiliateUrl("the-godfather-1972")).toBeNull()
    expect(getAmazonAffiliateUrl(null)).toBeNull()
    expect(getAmazonAffiliateUrl("")).toBeNull()
  })
})