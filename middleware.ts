import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

function authSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  if (path === "/auth/login" || path.startsWith("/auth/login/")) {
    return NextResponse.redirect(new URL("/auth/signin", req.url))
  }
  if (path === "/auth/signup" || path.startsWith("/auth/signup/")) {
    return NextResponse.redirect(new URL("/auth/register", req.url))
  }

  const secret = authSecret()
  const token =
    secret &&
    (await getToken({
      req,
      secret,
      secureCookie: process.env.NODE_ENV === "production",
    }))

  const userId = (token?.sub as string | undefined) ?? null

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
