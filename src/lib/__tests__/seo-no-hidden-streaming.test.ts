/**
 * Guard: crawlers that skip JavaScript (SEO audit tools, AI bots) must receive page
 * content in the initial HTML. A <Suspense> around the root {children}, or a
 * loading.tsx on an indexable route, makes Next stream the page into
 * `<div hidden id="S:n">` chunks that only a JS swap reveals — the page then looks
 * empty (4 words, no H1) and notFound() can no longer return an HTTP 404.
 */
import fs from "node:fs"
import path from "node:path"

const APP = path.join(process.cwd(), "src", "app")

/** Indexable routes: no loading.tsx here or in any parent segment. */
const INDEXABLE_ROUTES = [
  "",
  "actors/[id]",
  "movies/[slug]",
  "rate/[movieSlug]/[actorSlug]",
  "about",
  "discover",
  "news",
  "stories",
  "forum",
  "lists",
  "faceoff",
]

describe("no hidden streaming on indexable routes", () => {
  it("root layout does not wrap {children} in <Suspense>", () => {
    const src = fs.readFileSync(path.join(APP, "layout.tsx"), "utf8")
    // Strip comments so the explanatory note doesn't trip the check.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
    expect(code).not.toMatch(/<Suspense[^>]*>\s*\{children\}\s*<\/Suspense>/)
  })

  it.each(INDEXABLE_ROUTES)("no loading.tsx on /%s or its parents", (route) => {
    const segments = route.split("/").filter(Boolean)
    for (let i = 0; i <= segments.length; i++) {
      const file = path.join(APP, ...segments.slice(0, i), "loading.tsx")
      expect(fs.existsSync(file)).toBe(false)
    }
  })
})
