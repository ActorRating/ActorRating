import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Matcher below excludes the entire `api` segment — so /api/auth/*, /api/auth/callback/*,
// and /api/auth/session are never run through this middleware (no cookie / redirect interference).

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")

  if (host === "www.actorrating.com") {
    return NextResponse.redirect(
      `https://actorrating.com${req.nextUrl.pathname}${req.nextUrl.search}`,
      301
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
}
