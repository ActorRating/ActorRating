import {
  BOT_REASON_COOKIE_LESS_BURST,
  BOT_REASON_INTERNAL_REF_NEW_VISITOR,
  COOKIE_LESS_BURST_MAX_PER_HOUR,
  evaluateBotSuspectReasons,
  isInternalReferrerNewVisitorSuspect,
  isReversibleBotSuspectReason,
} from "../bot-suspect"

describe("isInternalReferrerNewVisitorSuspect", () => {
  it("flags first-ever visit with an internal referrer", () => {
    expect(
      isInternalReferrerNewVisitorSuspect({
        isNewVisitor: true,
        referrer: "https://actorrating.com/actors/tom-hanks",
      }),
    ).toBe(true)
    expect(
      isInternalReferrerNewVisitorSuspect({
        isNewVisitor: true,
        referrer: "https://www.actorrating.com/rate/foo/bar",
      }),
    ).toBe(true)
  })

  it("does not flag returning visitors or external / empty referrers", () => {
    expect(
      isInternalReferrerNewVisitorSuspect({
        isNewVisitor: false,
        referrer: "https://actorrating.com/actors/tom-hanks",
      }),
    ).toBe(false)
    expect(
      isInternalReferrerNewVisitorSuspect({
        isNewVisitor: true,
        referrer: "https://google.com/",
      }),
    ).toBe(false)
    expect(
      isInternalReferrerNewVisitorSuspect({
        isNewVisitor: true,
        referrer: null,
      }),
    ).toBe(false)
  })

  it("respects humanExempt", () => {
    expect(
      isInternalReferrerNewVisitorSuspect({
        isNewVisitor: true,
        referrer: "https://actorrating.com/",
        humanExempt: true,
      }),
    ).toBe(false)
  })
})

describe("evaluateBotSuspectReasons", () => {
  it("emits internal_ref_new_visitor and cookie_less_burst independently", () => {
    expect(
      evaluateBotSuspectReasons({
        isNewVisitor: true,
        referrer: "https://actorrating.com/movies/foo",
        cookieLessBurst: false,
      }),
    ).toEqual([BOT_REASON_INTERNAL_REF_NEW_VISITOR])

    expect(
      evaluateBotSuspectReasons({
        isNewVisitor: true,
        referrer: null,
        cookieLessBurst: true,
      }),
    ).toEqual([BOT_REASON_COOKIE_LESS_BURST])

    expect(
      evaluateBotSuspectReasons({
        isNewVisitor: true,
        referrer: "https://actorrating.com/",
        cookieLessBurst: true,
      }),
    ).toEqual([
      BOT_REASON_INTERNAL_REF_NEW_VISITOR,
      BOT_REASON_COOKIE_LESS_BURST,
    ])
  })

  it("skips cookie_less_burst when humanExempt", () => {
    expect(
      evaluateBotSuspectReasons({
        isNewVisitor: true,
        referrer: "https://actorrating.com/",
        humanExempt: true,
        cookieLessBurst: true,
      }),
    ).toEqual([])
  })
})

describe("isReversibleBotSuspectReason", () => {
  it("matches behavioural bot-suspect and crawl reasons", () => {
    expect(isReversibleBotSuspectReason("internal_ref_new_visitor")).toBe(true)
    expect(isReversibleBotSuspectReason("cookie_less_burst")).toBe(true)
    expect(isReversibleBotSuspectReason("crawl_path")).toBe(true)
    expect(isReversibleBotSuspectReason("reclassified_no_engagement")).toBe(true)
    expect(isReversibleBotSuspectReason("user_agent")).toBe(false)
    expect(isReversibleBotSuspectReason(null)).toBe(false)
  })
})

describe("COOKIE_LESS_BURST_MAX_PER_HOUR", () => {
  it("proposes N=10 cookie-less pageviews per IP per hour", () => {
    expect(COOKIE_LESS_BURST_MAX_PER_HOUR).toBe(10)
  })
})
