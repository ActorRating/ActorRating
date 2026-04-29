import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isValidSource } from "@/lib/tracking/source"

const { auth } = NextAuth(authConfig)

export async function middleware(request: NextRequest) {
  const url = request.nextUrl
  const src = url.searchParams.get("src")
  const hasExistingSrc = Boolean(request.cookies.get("ar_src")?.value)

  console.log("[TRACKING] src:", src)

  // 1️⃣ Create ONE response
  let response: NextResponse

  const host = request.headers.get("host")

  // Handle www → root redirect FIRST
  if (host === "www.actorrating.com") {
    response = NextResponse.redirect(
      `https://actorrating.com${url.pathname}${url.search}`,
      301
    )
  } else {
    response = NextResponse.next()
  }

  // 2️⃣ Set cookie BEFORE auth runs
  if (src && isValidSource(src) && !hasExistingSrc) {
    console.log("[TRACKING] setting cookie:", src)

    const isProduction = process.env.NODE_ENV === "production"
    const cookieDomain = host?.endsWith(".actorrating.com") ? ".actorrating.com" : undefined

    response.cookies.set("ar_src", src, {
      path: "/",
      domain: cookieDomain,
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 60 * 60 * 24 * 7,
    })
  }

  // 3️⃣ Now pass THROUGH NextAuth
  return auth(request, response)
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
}
