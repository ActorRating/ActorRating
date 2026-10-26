import {
  chromiumMajorFromUserAgent,
  detectClientSignalFlags,
  detectHeaderInconsistencies,
  extractRequestAnalyticsSignals,
  headersFromRecord,
  parseClientSignals,
} from "../request-signals"
import { evaluatePageViewBot } from "../pageview"
import { resolveBotCategory } from "../bot-category"

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
const FIREFOX_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0"
const SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
const CRIOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1"

const realChromeHeaders = {
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-fetch-site": "same-origin",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  "accept-language": "en-US,en;q=0.9",
}

describe("chromiumMajorFromUserAgent", () => {
  it("parses desktop/Android Chromium and ignores iOS Chrome / Firefox / Safari", () => {
    expect(chromiumMajorFromUserAgent(CHROME_UA)).toBe(124)
    expect(chromiumMajorFromUserAgent(ANDROID_UA)).toBe(124)
    expect(chromiumMajorFromUserAgent(FIREFOX_UA)).toBeNull()
    expect(chromiumMajorFromUserAgent(SAFARI_UA)).toBeNull()
    expect(chromiumMajorFromUserAgent(CRIOS_UA)).toBeNull()
  })
})

describe("detectHeaderInconsistencies", () => {
  it("passes a real Chrome same-origin beacon", () => {
    expect(detectHeaderInconsistencies(headersFromRecord(realChromeHeaders), CHROME_UA)).toEqual([])
  })

  it("flags a Chrome UA with no client hints and no sec-fetch (python/node spoof)", () => {
    const flags = detectHeaderInconsistencies(
      headersFromRecord({ "accept-language": "en-US" }),
      CHROME_UA,
    )
    expect(flags).toEqual(expect.arrayContaining(["ua_hint_mismatch", "missing_sec_fetch"]))
  })

  it("flags HeadlessChrome brand even with otherwise valid headers", () => {
    const flags = detectHeaderInconsistencies(
      headersFromRecord({
        ...realChromeHeaders,
        "sec-ch-ua": '"HeadlessChrome";v="124", "Chromium";v="124"',
      }),
      CHROME_UA,
    )
    expect(flags).toContain("headless_hint")
  })

  it("flags cross-site beacons", () => {
    const flags = detectHeaderInconsistencies(
      headersFromRecord({ ...realChromeHeaders, "sec-fetch-site": "cross-site" }),
      CHROME_UA,
    )
    expect(flags).toEqual(["cross_site_beacon"])
  })

  it("flags mobile hint contradictions but tolerates Android tablets", () => {
    expect(
      detectHeaderInconsistencies(
        headersFromRecord({ ...realChromeHeaders, "sec-ch-ua-mobile": "?1" }),
        CHROME_UA,
      ),
    ).toContain("mobile_hint_mismatch")
    expect(
      detectHeaderInconsistencies(
        headersFromRecord({ ...realChromeHeaders, "sec-ch-ua-mobile": "?0" }),
        ANDROID_UA,
      ),
    ).toContain("mobile_hint_mismatch")
    const tablet = ANDROID_UA.replace(" Mobile", "")
    expect(
      detectHeaderInconsistencies(
        headersFromRecord({ ...realChromeHeaders, "sec-ch-ua-mobile": "?0" }),
        tablet,
      ),
    ).toEqual([])
  })

  it("does not require client hints from Firefox / Safari / iOS Chrome", () => {
    const h = headersFromRecord({ "sec-fetch-site": "same-origin", "accept-language": "en" })
    expect(detectHeaderInconsistencies(h, FIREFOX_UA)).toEqual([])
    expect(detectHeaderInconsistencies(h, SAFARI_UA)).toEqual([])
    expect(detectHeaderInconsistencies(h, CRIOS_UA)).toEqual([])
  })
})

describe("extractRequestAnalyticsSignals", () => {
  it("reads cf-ipcountry and the verified-bot transform header", () => {
    const s = extractRequestAnalyticsSignals({
      headers: headersFromRecord({
        ...realChromeHeaders,
        "user-agent": CHROME_UA,
        "cf-ipcountry": "tr",
        "x-cf-verified-bot": "1",
      }) as unknown as Headers,
    })
    expect(s.country).toBe("TR")
    expect(s.cloudflareVerifiedBot).toBe(true)
    expect(s.secChUaPresent).toBe(true)
    expect(s.inconsistencies).toEqual([])
  })

  it("drops malformed country codes", () => {
    const s = extractRequestAnalyticsSignals({
      headers: headersFromRecord({ "cf-ipcountry": "Turkey" }) as unknown as Headers,
    })
    expect(s.country).toBeNull()
  })
})

describe("client signals", () => {
  it("sanitizes and clamps", () => {
    const parsed = parseClientSignals({
      webdriver: true,
      screenW: 1920,
      screenH: 1080,
      viewportW: -5,
      dpr: 2,
      timezone: "Europe/Istanbul",
      languages: "en-US,tr",
      touchPoints: 0,
      junk: "ignored",
    })
    expect(parsed).toMatchObject({
      webdriver: true,
      screenW: 1920,
      screenH: 1080,
      viewportW: null,
      dpr: 2,
      timezone: "Europe/Istanbul",
    })
    expect(detectClientSignalFlags(parsed)).toEqual(["webdriver"])
  })

  it("returns null for empty / non-object input", () => {
    expect(parseClientSignals(null)).toBeNull()
    expect(parseClientSignals([])).toBeNull()
    expect(parseClientSignals({ junk: 1 })).toBeNull()
  })

  it("flags zero-size screens", () => {
    expect(detectClientSignalFlags(parseClientSignals({ screenW: 0, screenH: 0 }))).toEqual([
      "zero_screen",
    ])
  })
})

describe("evaluatePageViewBot with header + client signals", () => {
  const base = { path: "/actors/tom-hanks", acceptLanguage: "en-US", ipHash: "abc" }

  it("real Chrome with hints and no burst is not a bot", () => {
    const r = evaluatePageViewBot({
      ...base,
      userAgent: CHROME_UA,
      headers: headersFromRecord(realChromeHeaders),
      clientSignals: parseClientSignals({ webdriver: false, screenW: 1440, screenH: 900 }),
    })
    expect(r).toEqual({ isLikelyBot: false, reasons: [] })
  })

  it("spoofed Chrome without hints is a bot with explicit reasons", () => {
    const r = evaluatePageViewBot({
      ...base,
      userAgent: CHROME_UA,
      headers: headersFromRecord({ "accept-language": "en-US" }),
    })
    expect(r.isLikelyBot).toBe(true)
    expect(r.reasons).toEqual(expect.arrayContaining(["ua_hint_mismatch", "missing_sec_fetch"]))
  })

  it("burst and webdriver are reported as reasons", () => {
    const r = evaluatePageViewBot({
      ...base,
      userAgent: CHROME_UA,
      headers: headersFromRecord(realChromeHeaders),
      clientSignals: parseClientSignals({ webdriver: true }),
      ipBurst: true,
    })
    expect(r.reasons).toEqual(expect.arrayContaining(["ip_burst", "webdriver"]))
  })

  it("Cloudflare verified bot is a KNOWN_CRAWLER even with a generic UA", () => {
    const r = evaluatePageViewBot({
      ...base,
      userAgent: CHROME_UA,
      headers: headersFromRecord(realChromeHeaders),
      cloudflareVerifiedBot: true,
    })
    expect(r.reasons).toEqual(["cf_verified_bot"])
    expect(resolveBotCategory(true, CHROME_UA, r.reasons)).toBe("KNOWN_CRAWLER")
  })
})
