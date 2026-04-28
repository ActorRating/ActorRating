import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isValidSource } from "@/lib/tracking/source"

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
  const url = req.nextUrl
  const src = url.searchParams.get("src")
  const existingSrcCookie = req.cookies.get("ar_src")?.value
  const hasExistingSrc = Boolean(existingSrcCookie)
  const shouldSetSource = !hasExistingSrc && isValidSource(src)
  const isDev = process.env.NODE_ENV !== "production"

  console.log("[TRACKING] incoming src:", src)

  const applyTrackingHeadersAndCookie = (response: NextResponse) => {
    if (isDev) {
      response.headers.set("x-src-debug", src ?? "")
      response.headers.set("x-cookie-debug", shouldSetSource ? src : existingSrcCookie ?? "")
    }

    if (shouldSetSource && src) {
      response.cookies.set("ar_src", src, {
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      })
      console.log("[TRACKING] cookie set:", src)
    }

    return response
  }

  // 301: www → canonical domain (SEO + cookie domain consistency)
  const host = req.headers.get("host")
  if (host === "www.actorrating.com") {
    return applyTrackingHeadersAndCookie(
      NextResponse.redirect(
      `https://actorrating.com${req.nextUrl.pathname}${req.nextUrl.search}`,
      301
    )
    )
  }

  return applyTrackingHeadersAndCookie(NextResponse.next())
})

export const config = {
  // Exclude Next.js internals, all /api/* routes (NextAuth callbacks must be
  // reachable without auth), and static assets.
  matcher: ["/((?!_next|api|favicon.ico).*)"],
}
