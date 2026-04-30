import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const src = url.searchParams.get("src")

  const response = NextResponse.redirect(new URL("/", req.url))

  if (src && ["tiktok", "instagram", "youtube"].includes(src)) {
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

