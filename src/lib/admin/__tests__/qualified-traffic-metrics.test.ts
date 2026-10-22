/**
 * @jest-environment node
 */

import { computeQualifiedTrafficRatios } from "@/lib/admin/getQualifiedTrafficMetrics"

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
