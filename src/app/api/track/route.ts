import { NextResponse } from "next/server"
import {
  AR_SRC_COOKIE,
  arSrcCookieOptions,
  normalizeAcquisitionSource,
} from "@/lib/tracking/source"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const src = normalizeAcquisitionSource(url.searchParams.get("src"))

  const response = NextResponse.redirect(new URL("/", req.url))

  if (src) {
    response.cookies.set(AR_SRC_COOKIE, src, arSrcCookieOptions())
  }

  return response
}
