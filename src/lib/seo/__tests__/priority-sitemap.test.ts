/**
 * @jest-environment node
 */

import fs from "fs"
import path from "path"
import {
  listPriorityStaticSitemapPaths,
  listSitemapIndexFilenames,
  maxLastmodFromUrlsetXml,
  resolveSitemapIndexLastmod,
} from "@/lib/seo/priority-sitemap"

const REPO = path.join(__dirname, "..", "..", "..", "..")
const SITEMAP_ROUTE = path.join(REPO, "src", "app", "sitemap.xml", "route.ts")
const GENERATE_SCRIPT = path.join(REPO, "scripts", "generate-sitemaps.ts")

describe("priority sitemap helpers", () => {
  it("includes home, methodology, discover, craft, and Odyssey hub", () => {
    const paths = listPriorityStaticSitemapPaths().map((e) => e.path)
    expect(paths).toContain("/")
    expect(paths).toContain("/methodology")
    expect(paths).toContain("/discover")
    expect(paths).toContain("/craft/emotional-range")
    expect(paths).toContain("/movies/the-odyssey-2026/best-performances")
    expect(paths).not.toContain("/privacy")
    expect(paths).not.toContain("/about")
  })

  it("orders index: priority → performances → lists → stories → news → actors → movies → static", () => {
    const names = listSitemapIndexFilenames({
      prioritySitemapCount: 1,
      performanceSitemapCount: 1,
      listSitemapCount: 1,
      storySitemapCount: 1,
      newsSitemapCount: 1,
      actorSitemapCount: 2,
      movieSitemapCount: 2,
    })
    expect(names[0]).toBe("priority.xml")
    expect(names).toEqual([
      "priority.xml",
      "performances-1.xml",
      "lists.xml",
      "stories.xml",
      "news.xml",
      "actors-1.xml",
      "actors-2.xml",
      "movies-1.xml",
      "movies-2.xml",
      "static.xml",
    ])
  })

  it("reads max lastmod from urlset XML (not generation time)", () => {
    const xml = `<?xml version="1.0"?>
<urlset>
  <url><loc>https://actorrating.com/</loc><lastmod>2024-01-01</lastmod></url>
  <url><loc>https://actorrating.com/a</loc><lastmod>2026-03-15</lastmod></url>
  <url><loc>https://actorrating.com/b</loc><lastmod>2025-12-01</lastmod></url>
</urlset>`
    expect(maxLastmodFromUrlsetXml(xml)).toBe("2026-03-15")
    expect(maxLastmodFromUrlsetXml("<urlset></urlset>")).toBeNull()
  })

  it("prefers per-file sitemapLastmods over generation fallback", () => {
    expect(
      resolveSitemapIndexLastmod("priority.xml", { "priority.xml": "2026-02-01" }, "2026-11-14"),
    ).toBe("2026-02-01")
    expect(resolveSitemapIndexLastmod("priority.xml", {}, "2026-11-14")).toBe("2026-11-14")
  })

  it("sitemap index route and generator mention priority.xml", () => {
    const route = fs.readFileSync(SITEMAP_ROUTE, "utf-8")
    const script = fs.readFileSync(GENERATE_SCRIPT, "utf-8")
    expect(route).toMatch(/priority\.xml/)
    expect(route).toMatch(/listSitemapIndexFilenames/)
    expect(script).toMatch(/generatePriority/)
    expect(script).toMatch(/priority\.xml/)
    expect(script).toMatch(/userId" IS NOT NULL/)
  })
})
