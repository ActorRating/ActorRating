import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

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
