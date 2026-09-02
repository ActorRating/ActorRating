import { describe, expect, it } from "vitest"
import {
  comparePerformanceSeoRows,
  pickCanonicalPerformanceSeoMeta,
} from "../rate-page-canonical-perf"

const SYSTEM_USER_ID = "uuid-from-auth-users"

describe("pickCanonicalPerformanceSeoMeta", () => {
  it("prefers LEAD/SUPPORTING over MINOR even when MINOR is listed first", () => {
    const meta = pickCanonicalPerformanceSeoMeta([
      { tier: "MINOR", character: "Extra", userId: SYSTEM_USER_ID, order: 0 },
      { tier: "LEAD", character: "Narrator", userId: "other", order: 5 },
    ])
    expect(meta.tier).toBe("LEAD")
    expect(meta.characters).toEqual(["Extra", "Narrator"])
  })

  it("prefers system user among equal non-MINOR tiers", () => {
    const meta = pickCanonicalPerformanceSeoMeta([
      { tier: "SUPPORTING", character: "A", userId: "u1", order: 1, createdAt: new Date("2020-01-01") },
      {
        tier: "SUPPORTING",
        character: "B",
        userId: SYSTEM_USER_ID,
        order: 2,
        createdAt: new Date("2021-01-01"),
      },
    ])
    expect(meta.tier).toBe("SUPPORTING")
    expect(meta.characters).toContain("A")
    expect(meta.characters).toContain("B")
  })

  it("among LEAD/SUPPORTING, prefers system user over billing order", () => {
    const rows = [
      { tier: "LEAD" as const, userId: "u1", order: 0 },
      { tier: "SUPPORTING" as const, userId: SYSTEM_USER_ID, order: 99 },
    ]
    const sorted = [...rows].sort(comparePerformanceSeoRows)
    expect(sorted[0].tier).toBe("SUPPORTING")
    expect(sorted[0].userId).toBe(SYSTEM_USER_ID)
  })

  it("falls back to seeded score from a secondary row when best tier lacks it", () => {
    const meta = pickCanonicalPerformanceSeoMeta([
      { tier: "LEAD", seededAggregateScore: null, userId: SYSTEM_USER_ID },
      { tier: "MINOR", seededAggregateScore: 8.2, userId: "u1" },
    ])
    expect(meta.tier).toBe("LEAD")
    expect(meta.seededAggregateScore).toBe(8.2)
  })
})
