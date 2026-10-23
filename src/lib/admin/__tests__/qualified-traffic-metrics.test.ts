/**
 * @jest-environment node
 */

import {
  computeQualifiedTrafficRatios,
  countDistinctEngagedHumans,
  mergeQualifiedTrafficChannels,
} from "@/lib/admin/getQualifiedTrafficMetrics"

describe("computeQualifiedTrafficRatios", () => {
  it("returns n/a-equivalent nulls for zero denominators", () => {
    expect(
      computeQualifiedTrafficRatios({
        humanPageviews: 0,
        qualifiedVisits: 0,
        ratings: 0,
      }),
    ).toEqual({
      humanToQualifiedRatio: null,
      humanToQualifiedExceeded: false,
      qualifiedToRatingRatio: null,
      humanPageviewsWithoutQualifiedShare: null,
    })
  })

  it("computes ratios and the without-qualified share", () => {
    expect(
      computeQualifiedTrafficRatios({
        humanPageviews: 100,
        qualifiedVisits: 40,
        ratings: 10,
      }),
    ).toEqual({
      humanToQualifiedRatio: 0.4,
      humanToQualifiedExceeded: false,
      qualifiedToRatingRatio: 0.25,
      humanPageviewsWithoutQualifiedShare: 0.6,
    })
  })

  it("clamps without-qualified share when qualified exceeds human", () => {
    expect(
      computeQualifiedTrafficRatios({
        humanPageviews: 10,
        qualifiedVisits: 12,
        ratings: 3,
      }).humanPageviewsWithoutQualifiedShare,
    ).toBe(0)
  })

  it("shows n/a (null) for human→qualified when qualified exceeds human", () => {
    expect(
      computeQualifiedTrafficRatios({
        humanPageviews: 10,
        qualifiedVisits: 12,
        ratings: 3,
      }),
    ).toMatchObject({
      humanToQualifiedRatio: null,
      humanToQualifiedExceeded: true,
    })
  })

  it("caps human→qualified at 100% when equal", () => {
    expect(
      computeQualifiedTrafficRatios({
        humanPageviews: 50,
        qualifiedVisits: 50,
        ratings: 5,
      }).humanToQualifiedRatio,
    ).toBe(1)
  })
})

describe("countDistinctEngagedHumans", () => {
  it("counts distinct ipHash, not event rows", () => {
    expect(
      countDistinctEngagedHumans([
        { ipHash: "a" },
        { ipHash: "a" },
        { ipHash: "b" },
        { ipHash: "b" },
        { ipHash: "b" },
        { ipHash: "c" },
      ]),
    ).toBe(3)
  })

  it("ignores blank ipHash", () => {
    expect(
      countDistinctEngagedHumans([
        { ipHash: "a" },
        { ipHash: "" },
        { ipHash: "  " },
        { ipHash: "a" },
      ]),
    ).toBe(1)
  })

  it("returns 0 for empty input", () => {
    expect(countDistinctEngagedHumans([])).toBe(0)
  })
})

describe("mergeQualifiedTrafficChannels", () => {
  it("merges engaged humans ahead of noisy human pageviews", () => {
    const rows = mergeQualifiedTrafficChannels(
      [
        { key: "x", count: 2 },
        { key: "google", count: 5 },
      ],
      [
        { key: "x", count: 100 },
        { key: "(none)", count: 9000 },
      ],
      [
        { key: "x", count: 3 },
        { key: "google", count: 8 },
      ],
      [{ key: "google", count: 1 }],
      [{ key: "google", signups: 1, repeatRaters: 0 }],
    )

    expect(rows[0]).toMatchObject({
      key: "google",
      engagedHumans: 5,
      qualifiedVisits: 8,
      ratings: 1,
      signups: 1,
    })
    expect(rows.find((r) => r.key === "x")).toMatchObject({
      engagedHumans: 2,
      humanPageviews: 100,
      qualifiedVisits: 3,
    })
    expect(rows.find((r) => r.key === "(none)")).toMatchObject({
      engagedHumans: 0,
      humanPageviews: 9000,
    })
  })
})
