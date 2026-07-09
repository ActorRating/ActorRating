import NextAuth from "next-auth"
import { authConfig } from "./src/auth.config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const { auth } = NextAuth(authConfig)

/**
 * Single middleware entrypoint (project root). Next.js uses this file, not `src/middleware.ts`.
 * - Legacy auth path redirects
 * - www → apex (canonical host)
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

  const host = req.headers.get("host")
  if (host === "www.actorrating.com") {
    return NextResponse.redirect(
      `https://actorrating.com${req.nextUrl.pathname}${req.nextUrl.search}`,
      301,
    )
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next|api|favicon\\.ico|sitemap\\.xml|sitemaps|robots\\.txt).*)"],
}
