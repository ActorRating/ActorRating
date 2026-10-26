/**
 * @jest-environment node
 */

import {
  HUB_ENABLED_SLUGS,
  findHubPathInFilmography,
  hubBestPerformancesPath,
  isHubEnabledSlug,
} from "@/lib/movie-best-performances/hub-allowlist"
import { loadMovieBestPerformancesHub } from "@/lib/movie-best-performances/load-hub"

describe("hub allowlist", () => {
  it("enables only the-odyssey-2026", () => {
    expect(HUB_ENABLED_SLUGS).toEqual(["the-odyssey-2026"])
    expect(isHubEnabledSlug("the-odyssey-2026")).toBe(true)
    expect(isHubEnabledSlug("inception-2010")).toBe(false)
    expect(isHubEnabledSlug("the-godfather-1972")).toBe(false)
  })

  it("builds hub paths only for allowlisted slugs", () => {
    expect(hubBestPerformancesPath("the-odyssey-2026")).toBe(
      "/movies/the-odyssey-2026/best-performances",
    )
    expect(hubBestPerformancesPath("inception-2010")).toBeNull()
  })

  it("finds a hub path from already-loaded filmography without inventing movies", () => {
    expect(
      findHubPathInFilmography([
        { slug: "inception-2010" },
        { slug: "the-odyssey-2026" },
        { slug: null },
      ]),
    ).toBe("/movies/the-odyssey-2026/best-performances")
    expect(findHubPathInFilmography([{ slug: "inception-2010" }])).toBeNull()
    expect(findHubPathInFilmography([])).toBeNull()
  })

  it("wires crawlable hub hrefs into movie page, methodology, and crawl shell sources", () => {
    const fs = require("fs") as typeof import("fs")
    const path = require("path") as typeof import("path")
    const root = path.join(__dirname, "..", "..", "..", "..")
    const moviePage = fs.readFileSync(
      path.join(root, "src/app/movies/[slug]/page.tsx"),
      "utf-8",
    )
    const methodology = fs.readFileSync(
      path.join(root, "src/app/methodology/page.tsx"),
      "utf-8",
    )
    const crawlShell = fs.readFileSync(
      path.join(root, "src/components/seo/ActorPageCrawlShell.tsx"),
      "utf-8",
    )
    const hubLink = fs.readFileSync(
      path.join(root, "src/components/seo/MovieHubCrawlLink.tsx"),
      "utf-8",
    )
    expect(moviePage).toContain("MovieHubCrawlLink")
    expect(moviePage).toContain("isHubEnabledSlug")
    expect(hubLink).toContain("See the community ranking of performances in this film")
    expect(hubLink).toContain("hubBestPerformancesPath")
    expect(methodology).toContain("/movies/the-odyssey-2026/best-performances")
    expect(crawlShell).toContain("hubPath")
    expect(crawlShell).toContain("See the community ranking of performances in this film")
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
