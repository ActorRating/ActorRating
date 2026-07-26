import { NextResponse } from "next/server"
import {
  AR_SRC_COOKIE,
  arSrcCookieOptions,
  normalizeAcquisitionSource,
} from "@/lib/tracking/source"

/**
 * Acquisition short link: /api/track?src=tiktok|instagram|youtube|x
 * Sets ar_src cookie and redirects to /?src=… so the first pageview
 * beacon records utmSource for the admin dashboard.
 * Alias: ?src=twitter → x.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const src = normalizeAcquisitionSource(url.searchParams.get("src"))

  const dest = new URL("/", req.url)
  if (src) {
    dest.searchParams.set("src", src)
  }

  const response = NextResponse.redirect(dest)

  if (src) {
    response.cookies.set(AR_SRC_COOKIE, src, arSrcCookieOptions())
  }

  return response
}
