export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { checkRateLimitScopes } from "@/lib/rateLimit"
import { getClientIp } from "@/lib/requestProtection"
import { containsBadWord } from "@/lib/validation/sanitizeName"
import { isValidUsername, normalizeUsername } from "@/lib/validation/username"

type UpdateProfileBody = {
  name?: string
  username?: string
  onboardingCompleted?: boolean
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    const sessionEmail = session?.user?.email?.trim().toLowerCase()
    if (!sessionEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const clientIp = getClientIp(request)
    const limit = await checkRateLimitScopes({ ip: clientIp, action: "profileUpdate", userId: sessionEmail })
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }
    const cooldown = await checkRateLimitScopes({ ip: clientIp, action: "profileUpdateCooldown", userId: sessionEmail })
    if (!cooldown.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const body = (await request.json()) as UpdateProfileBody
    const name = (body.name ?? "").trim()
    const username = normalizeUsername(body.username ?? "")
    const onboardingCompleted = true

    if (!name) {
      console.warn("[update-profile] rejected: empty name", { email: sessionEmail })
      return NextResponse.json({ error: "Display name is required" }, { status: 400 })
    }

    if (containsBadWord(name)) {
      console.warn("[update-profile] rejected: bad word in name", { email: sessionEmail })
      return NextResponse.json({ error: "Please choose a different display name" }, { status: 400 })
    }

    if (!username) {
      console.warn("[update-profile] rejected: empty username", { email: sessionEmail })
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    if (!isValidUsername(username) || containsBadWord(username)) {
      console.warn("[update-profile] rejected: invalid username", { email: sessionEmail, username })
      return NextResponse.json({ error: "Invalid username format" }, { status: 400 })
    }

    console.log("[update-profile] saving:", { email: sessionEmail, username })

    let updatedUser: { id: string; email: string; name: string | null; username: string; onboardingCompleted: boolean }
    try {
      updatedUser = await prisma.user.upsert({
        where: { email: sessionEmail },
        update: { name, username, onboardingCompleted },
        create: {
          email: sessionEmail,
          name,
          username,
          onboardingCompleted,
        },
        select: { id: true, email: true, name: true, username: true, onboardingCompleted: true },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        console.warn("[update-profile] username conflict:", { email: sessionEmail, username })
        return NextResponse.json({ error: "Username already taken" }, { status: 409 })
      }
      throw error
    }

    console.log("[update-profile] saved successfully:", { email: sessionEmail, userId: updatedUser.id })
    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error("Update profile API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

