/**
 * @jest-environment node
 */

import { HUB_ENABLED_SLUGS, isHubEnabledSlug } from "@/lib/movie-best-performances/hub-allowlist"
import { loadMovieBestPerformancesHub } from "@/lib/movie-best-performances/load-hub"

describe("hub allowlist", () => {
  it("enables only the-odyssey-2026", () => {
    expect(HUB_ENABLED_SLUGS).toEqual(["the-odyssey-2026"])
    expect(isHubEnabledSlug("the-odyssey-2026")).toBe(true)
    expect(isHubEnabledSlug("inception-2010")).toBe(false)
    expect(isHubEnabledSlug("the-godfather-1972")).toBe(false)
  })

  it("non-allowlisted slug returns null and runs no queries", async () => {
    const prisma = {
      movie: { findFirst: jest.fn() },
      performance: { findMany: jest.fn() },
      rating: { findMany: jest.fn() },
    }

    const result = await loadMovieBestPerformancesHub(
      prisma as never,
      "inception-2010",
    )

    expect(result).toBeNull()
    expect(prisma.movie.findFirst).not.toHaveBeenCalled()
    expect(prisma.performance.findMany).not.toHaveBeenCalled()
    expect(prisma.rating.findMany).not.toHaveBeenCalled()
  })
})
