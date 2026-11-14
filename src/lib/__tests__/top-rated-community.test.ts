/**
 * @jest-environment node
 */

import {
  filterIndexablePerformanceLinks,
  type TopRatedPerformanceLink,
} from "@/lib/top-rated-community"

function row(
  partial: Partial<TopRatedPerformanceLink> &
    Pick<TopRatedPerformanceLink, "actorId" | "movieId" | "indexable">,
): TopRatedPerformanceLink {
  return {
    actorName: "Actor",
    actorSlug: "actor",
    movieTitle: "Film",
    movieSlug: "film-2020",
    movieYear: 2020,
    character: "Lead",
    signedInCount: 3,
    communityRatingCount: 3,
    avgScore10: 8.2,
    tier: "LEAD",
    href: "/rate/film-2020/actor",
    ...partial,
  }
}

describe("filterIndexablePerformanceLinks", () => {
  it("keeps only indexable rows", () => {
    const rows = [
      row({ actorId: "a1", movieId: "m1", indexable: true }),
      row({ actorId: "a2", movieId: "m2", indexable: false }),
      row({ actorId: "a3", movieId: "m3", indexable: true }),
    ]
    expect(filterIndexablePerformanceLinks(rows).map((r) => r.actorId)).toEqual([
      "a1",
      "a3",
    ])
  })

  it("returns empty for zero data", () => {
    expect(filterIndexablePerformanceLinks([])).toEqual([])
  })
})
