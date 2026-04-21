export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rateLimit"
import { getClientIp } from "@/lib/requestProtection"
import { isValidUsername, normalizeUsername } from "@/lib/validation/username"

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    const limit = await checkRateLimit(clientIp, "usernameCheck")
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }
    const cooldown = await checkRateLimit(clientIp, "usernameCheckCooldown")
    if (!cooldown.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const rawUsername = request.nextUrl.searchParams.get("username") ?? ""
    const username = normalizeUsername(rawUsername)

    if (!isValidUsername(username)) {
      return NextResponse.json({ available: false, error: "Invalid username" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })

    return NextResponse.json({ available: !existing })
  } catch (error) {
    console.error("Check username API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

