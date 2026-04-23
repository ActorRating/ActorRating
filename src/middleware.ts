import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Middleware is the ONLY place that enforces authentication.
 *
 * NextAuth(authConfig).auth wraps every matched request:
 *   - Decodes the JWT from the session cookie (Edge-safe, no DB call)
 *   - Calls authConfig.callbacks.authorized() with the decoded session
 *   - authorized() returns false  → NextAuth redirects to /auth/signin
 *   - authorized() returns a Response → used as-is (e.g. redirect to /dashboard)
 *   - authorized() returns true  → request proceeds normally
 *
 * The www→canonical redirect runs first, before auth is checked.
 */

const { auth } = NextAuth(authConfig)

export default auth((req: NextRequest & { auth: unknown }) => {
  // 301: www → canonical domain (SEO + cookie domain consistency)
  const host = req.headers.get("host")
  if (host === "www.actorrating.com") {
    return NextResponse.redirect(
      `https://actorrating.com${req.nextUrl.pathname}${req.nextUrl.search}`,
      301
    )
  }

  return NextResponse.next()
})

export const config = {
  // Exclude Next.js internals, all /api/* routes (NextAuth callbacks must be
  // reachable without auth), and static assets.
  matcher: ["/((?!_next|api|favicon.ico).*)"],
}
