/**
 * @jest-environment node
 */

import fs from "fs"
import path from "path"
import { HUB_ENABLED_SLUGS } from "@/lib/movie-best-performances/hub-allowlist"
import {
  countStaticSitemapPath,
  listStaticSitemapLocs,
  listStaticSitemapPaths,
} from "@/lib/seo/static-sitemap-urls"

const REPO = path.join(__dirname, "..", "..", "..", "..")
const STATIC_XML = path.join(REPO, "public", "sitemaps", "static.xml")
const SITEMAP_ROUTE = path.join(REPO, "src", "app", "sitemap.xml", "route.ts")

describe("static sitemap URLs", () => {
  it("includes each hub path exactly once in the shared list", () => {
    for (const slug of HUB_ENABLED_SLUGS) {
      const hubPath = `/movies/${slug}/best-performances`
      expect(countStaticSitemapPath(hubPath)).toBe(1)
    }
    expect(listStaticSitemapPaths().filter((e) => e.path.includes("/best-performances"))).toHaveLength(
      HUB_ENABLED_SLUGS.length,
    )
  })

  it("commits static.xml with the Odyssey hub loc exactly once", () => {
    const xml = fs.readFileSync(STATIC_XML, "utf-8")
    const hubLoc = "https://actorrating.com/movies/the-odyssey-2026/best-performances"
    expect(xml.split(hubLoc).length - 1).toBe(1)
    for (const loc of listStaticSitemapLocs("https://actorrating.com")) {
      expect(xml).toContain(`<loc>${loc}</loc>`)
    }
  })

  it("sitemap index route lists static.xml", () => {
    const src = fs.readFileSync(SITEMAP_ROUTE, "utf-8")
    expect(src).toMatch(/sitemaps\/static\.xml/)
    expect(src).toMatch(/static\.xml/)
  })
})
