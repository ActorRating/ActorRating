import { NextResponse } from "next/server"

const VALID_SOURCES = ["tiktok", "instagram", "youtube"] as const

export async function GET(req: Request) {
  const url = new URL(req.url)
  const src = url.searchParams.get("src")

  const response = NextResponse.redirect(new URL("/", url.origin))

  if (src && (VALID_SOURCES as readonly string[]).includes(src)) {
    response.cookies.set("ar_src", src, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 7,
    })
  }

  return response
}

