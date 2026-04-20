import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Database sessions use an opaque cookie, not a JWT — `getToken` always returns null.
 * Resolve the signed-in user by hitting the session route (runs with Prisma on the server).
 */
async function getSessionUserId(req: NextRequest): Promise<string | null> {
  const sessionUrl = new URL("/api/auth/session", req.nextUrl.origin)
  const res = await fetch(sessionUrl, {
    headers: { cookie: req.headers.get("cookie") ?? "" },
    cache: "no-store",
  })
  if (!res.ok) {
    return null
  }
  try {
    const data = (await res.json()) as { user?: { id?: string } } | null
    return data?.user?.id ?? null
  } catch {
    return null
  }
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  if (path === "/auth/login" || path.startsWith("/auth/login/")) {
    return NextResponse.redirect(new URL("/auth/signin", req.url))
  }
  if (path === "/auth/signup" || path.startsWith("/auth/signup/")) {
    return NextResponse.redirect(new URL("/auth/register", req.url))
  }

  const userId = await getSessionUserId(req)

  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true" && process.env.NODE_ENV === "development"

  if (isDevMode && req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.next()
  }

  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    if (!userId) {
      return NextResponse.redirect(new URL("/auth/signin", req.url))
    }
  }

  if (
    userId &&
    (req.nextUrl.pathname.startsWith("/auth/signin") ||
      req.nextUrl.pathname.startsWith("/auth/register"))
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/signin", "/auth/signup", "/auth/login", "/auth/register"],
}
