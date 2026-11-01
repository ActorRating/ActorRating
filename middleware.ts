import NextAuth from "next-auth"
import { authConfig } from "./src/auth.config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const { auth } = NextAuth(authConfig)

/** Indexable detail routes whose path segments are lowercase slugs/ids. */
const CASE_SENSITIVE_SLUG_ROUTES = /^\/(actors|movies|rate)\/./

/**
 * Single middleware entrypoint (project root). Next.js uses this file, not `src/middleware.ts`.
 * - Legacy auth path redirects
 * - www → apex 308 (canonical host; permanent + method-preserving)
 * - Uppercase slug paths under /actors, /movies, /rate → lowercase 308
 * - NextAuth `authorized` for protected routes (see `src/auth.config.ts`)
 */
export default auth((req: NextRequest & { auth: unknown }) => {
  const path = req.nextUrl.pathname
  if (path === "/auth/login" || path.startsWith("/auth/login/")) {
    return NextResponse.redirect(new URL("/auth/signin", req.url))
  }
  if (path === "/auth/signup" || path.startsWith("/auth/signup/")) {
    return NextResponse.redirect(new URL("/auth/register", req.url))
  }

  // Slugs/ids are lowercase (slugs from createSlug, ids are cuids). An uppercase
  // variant (e.g. /actors/Tom-Hanks, from typos or scraped links) otherwise
  // renders a duplicate page. Redirect to the one canonical lowercase URL.
  const lowerPath = CASE_SENSITIVE_SLUG_ROUTES.test(path) ? path.toLowerCase() : path

  const host = req.headers.get("host")
  if (host === "www.actorrating.com") {
    // 308: permanent + preserve method (unlike 301, which may rewrite POST→GET)
    return NextResponse.redirect(
      `https://actorrating.com${lowerPath}${req.nextUrl.search}`,
      308,
    )
  }
  if (lowerPath !== path) {
    const url = req.nextUrl.clone()
    url.pathname = lowerPath
    return NextResponse.redirect(url, 308)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next|api|favicon\\.ico|sitemap\\.xml|sitemaps|robots\\.txt).*)"],
}
