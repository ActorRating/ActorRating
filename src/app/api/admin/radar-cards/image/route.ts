export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { getRadarCardPayload } from "@/lib/admin/radar-card-data"
import { buildRadarCardSvg } from "@/lib/share/radarCardSvg"
import { upgradeActorImageRes } from "@/lib/tmdb"

export const runtime = "nodejs"

async function toEmbeddedImageDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  try {
    const upgraded = upgradeActorImageRes(url) ?? url
    let parsed: URL
    try {
      parsed = new URL(upgraded)
    } catch {
      return null
    }
    const host = parsed.hostname.toLowerCase()
    const allowed =
      host === "image.tmdb.org" ||
      host.endsWith(".tmdb.org") ||
      host === "actorrating.com" ||
      host.endsWith(".actorrating.com")
    if (!allowed || (parsed.protocol !== "https:" && parsed.protocol !== "http:")) {
      return null
    }
    const res = await fetch(upgraded, {
      headers: { Accept: "image/*" },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    const contentType = res.headers.get("content-type") || "image/jpeg"
    if (!contentType.startsWith("image/")) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength > 1_500_000) return null
    return `data:${contentType};base64,${buf.toString("base64")}`
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) {
    return new Response("Unauthorized", { status: 401 })
  }

  const actorId = request.nextUrl.searchParams.get("actorId")?.trim()
  const movieId = request.nextUrl.searchParams.get("movieId")?.trim()
  const ratingId = request.nextUrl.searchParams.get("ratingId")?.trim() || null
  const size = (request.nextUrl.searchParams.get("size") || "square") as
    | "square"
    | "og"
    | "feed"
    | "story"

  if (!actorId || !movieId) {
    return new Response("actorId and movieId are required", { status: 400 })
  }

  try {
    const payload = await getRadarCardPayload(prisma, actorId, movieId, ratingId)
    if (!payload) {
      return new Response("No rating data for this performance", { status: 404 })
    }

    const dims =
      size === "square"
        ? { w: 1080, h: 1080 }
        : size === "feed"
          ? { w: 1080, h: 1350 }
          : size === "story"
            ? { w: 1080, h: 1920 }
            : { w: 1200, h: 630 }

    const embeddedActorImage = await toEmbeddedImageDataUrl(payload.actorImageUrl)
    const svg = buildRadarCardSvg({
      width: dims.w,
      height: dims.h,
      actorName: payload.actorName,
      movieTitle: payload.movieTitle,
      movieYear: payload.movieYear,
      roleName: payload.roleName,
      username: payload.username,
      scoreOutOf10: payload.scoreOutOf10,
      quote: payload.quote,
      axes: payload.axes,
      actorImageUrl: embeddedActorImage,
    })

    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "private, no-store",
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(`Radar card error: ${msg}`, { status: 500 })
  }
}
