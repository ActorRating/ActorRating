export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserId } from "@/lib/authUser"
import { checkRateLimitScopes } from "@/lib/rateLimit"
import { getClientIp } from "@/lib/requestProtection"
import { containsBadWord } from "@/lib/validation/sanitizeName"
import { isValidUsername, normalizeUsername } from "@/lib/validation/username"

type UpdateProfileBody = {
  name?: string
  username?: string
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const clientIp = getClientIp(request)
    const limit = await checkRateLimitScopes({ ip: clientIp, action: "profileUpdate", userId })
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }
    const cooldown = await checkRateLimitScopes({ ip: clientIp, action: "profileUpdateCooldown", userId })
    if (!cooldown.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const body = (await request.json()) as UpdateProfileBody
    const name = (body.name ?? "").trim()
    const username = normalizeUsername(body.username ?? "")

    if (!name) {
      return NextResponse.json({ error: "Please choose a different name" }, { status: 400 })
    }

    if (containsBadWord(name)) {
      return NextResponse.json({ error: "Please choose a different name" }, { status: 400 })
    }

    if (!isValidUsername(username) || containsBadWord(username)) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 })
    }

    let updatedUser: { id: string; email: string; name: string | null; username: string }
    try {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { name, username },
        select: { id: true, email: true, name: true, username: true },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error("Update profile API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

