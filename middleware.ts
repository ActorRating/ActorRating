import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Legacy URL redirects only.
 *
 * Do not call `/api/auth/session` (or other same-origin APIs) from Edge middleware:
 * on Vercel that can deadlock or 500 the original request. Dashboard auth is enforced
 * in `src/app/dashboard/page.tsx` via `getServerUserId()`.
 */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  if (path === "/auth/login" || path.startsWith("/auth/login/")) {
    return NextResponse.redirect(new URL("/auth/signin", req.url))
  }
  if (path === "/auth/signup" || path.startsWith("/auth/signup/")) {
    return NextResponse.redirect(new URL("/auth/register", req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/auth/login", "/auth/login/:path*", "/auth/signup", "/auth/signup/:path*"],
}
