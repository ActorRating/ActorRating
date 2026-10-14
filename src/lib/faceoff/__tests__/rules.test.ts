import { canonicalPairKey, resolveComparisonType } from "@/lib/faceoff/pair"
import { pickWeighted, scoreOpponent, type ScoreCandidate } from "@/lib/faceoff/matchmaking-score"
import { evaluateVoteRules } from "@/lib/faceoff/vote-rules"
import { isFaceOffEnabled } from "@/lib/faceoff/constants"

const base = (overrides: Partial<ScoreCandidate>): ScoreCandidate => ({
  id: "a",
  elo: 1500,
  comparisonCount: 10,
  popularity: 100,
  year: 2013,
  genre: "Drama",
  ...overrides,
})

describe("face-off matchmaking rules", () => {
  it("keeps a reversed pair as the same key", () => {
    expect(canonicalPairKey("b", "a")).toBe(canonicalPairKey("a", "b"))
    expect(canonicalPairKey("a", "b")).toBe("a:b")
  })

  it("never pairs an actor against a performance in mixed mode", () => {
    expect(resolveComparisonType("mixed", null)).toBe("actor")
    expect(resolveComparisonType("mixed", "actor")).toBe("performance")
    expect(resolveComparisonType("mixed", "performance")).toBe("actor")
    expect(resolveComparisonType("actor", "performance")).toBe("actor")
    expect(resolveComparisonType("performance", "actor")).toBe("performance")
  })

  it("does not let raw popularity outrank a much closer rating", () => {
    const anchor = base({ id: "anchor", elo: 1500, popularity: 50, comparisonCount: 4 })
    const close = base({ id: "close", elo: 1510, popularity: 20, comparisonCount: 3, genre: "Drama" })
    const famous = base({ id: "famous", elo: 1900, popularity: 5000, comparisonCount: 80, genre: "Horror" })
    const pool = [close, famous]
    const closeScore = scoreOpponent(anchor, close, pool, { genres: ["Drama"], familiarity: "balanced" })
    const famousScore = scoreOpponent(anchor, famous, pool, { genres: ["Drama"], familiarity: "balanced" })
    expect(closeScore).toBeGreaterThan(famousScore)
  })

  it("can still pick a less-exposed opponent", () => {
    const items = [base({ id: "seen" }), base({ id: "fresh" })]
    const picked = pickWeighted(items, (item) => (item.id === "fresh" ? 100 : 0.0001), () => 0.99)
    expect(picked?.id).toBe("fresh")
  })

  it("returns null for an empty candidate pool", () => {
    expect(pickWeighted([], () => 1)).toBeNull()
  })
})

describe("face-off vote rules", () => {
  const now = new Date("2026-10-14T12:00:00Z")
  const valid = {
    sessionId: "session",
    matchupSessionId: "session",
    leftId: "left",
    rightId: "right",
    winnerId: "left",
    expiresAt: new Date("2026-10-14T12:20:00Z"),
    consumedAt: null,
    now,
    leftEligible: true,
    rightEligible: true,
    sameType: true,
    alreadyVoted: false,
    choiceCount: 1,
    maxChoices: 800,
  }

  it("accepts a valid vote", () => {
    expect(evaluateVoteRules(valid).ok).toBe(true)
  })

  it("rejects another session, a bad winner, a mixed pair, a duplicate, and an expired matchup", () => {
    expect(evaluateVoteRules({ ...valid, matchupSessionId: "other" }).ok).toBe(false)
    expect(evaluateVoteRules({ ...valid, winnerId: "someone-else" }).ok).toBe(false)
    expect(evaluateVoteRules({ ...valid, sameType: false }).ok).toBe(false)
    expect(evaluateVoteRules({ ...valid, alreadyVoted: true }).ok).toBe(false)
    expect(evaluateVoteRules({ ...valid, leftId: "same", rightId: "same", winnerId: "same" }).ok).toBe(false)
    expect(evaluateVoteRules({ ...valid, expiresAt: new Date("2026-10-14T11:00:00Z") }).ok).toBe(false)
    expect(evaluateVoteRules({ ...valid, consumedAt: now }).ok).toBe(false)
    expect(evaluateVoteRules({ ...valid, choiceCount: 800 }).ok).toBe(false)
  })
})

describe("face-off flag", () => {
  const previous = process.env.FACEOFF_ENABLED
  afterEach(() => {
    if (previous == null) delete process.env.FACEOFF_ENABLED
    else process.env.FACEOFF_ENABLED = previous
  })

  it("stays on unless explicitly disabled", () => {
    delete process.env.FACEOFF_ENABLED
    expect(isFaceOffEnabled()).toBe(true)
    process.env.FACEOFF_ENABLED = "false"
    expect(isFaceOffEnabled()).toBe(false)
  })
})
