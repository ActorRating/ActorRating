import { NextResponse } from "next/server"
import { buildRobotsTxt } from "@/lib/seo/ai-bot-policy"

export const dynamic = "force-static"

export function GET() {
  const body = buildRobotsTxt({
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "https://actorrating.com",
  })
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
