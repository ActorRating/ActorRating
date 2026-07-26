export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { clearPendingSignupCookie } from "@/lib/auth/pendingSignup"
import { checkRateLimitScopes } from "@/lib/rateLimit"
import { getClientIp } from "@/lib/requestProtection"
import { containsBadWord } from "@/lib/validation/sanitizeName"
import { isValidUsername, normalizeUsername } from "@/lib/validation/username"

type Body = {
  username?: string
  termsAccepted?: boolean
}

/**
 * Finish incomplete accounts (Google without pending cookie, legacy users).
 * Sets username, termsAcceptedAt, onboardingCompleted.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const sessionEmail = session?.user?.email?.trim().toLowerCase()
    if (!sessionEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const clientIp = getClientIp(request)
    const limit = await checkRateLimitScopes({
      ip: clientIp,
      action: "profileUpdate",
      userId: sessionEmail,
    })
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const body = (await request.json()) as Body
    if (body.termsAccepted !== true) {
      return NextResponse.json({ error: "You must agree to the Terms" }, { status: 400 })
    }

    const username = normalizeUsername(body.username ?? "")
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }
    if (!isValidUsername(username) || containsBadWord(username)) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true, name: true, username: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          username,
          termsAcceptedAt: now,
          onboardingCompleted: true,
          onboardingStartedAt: null,
          name: user.name?.trim() || username,
        },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          onboardingCompleted: true,
          termsAcceptedAt: true,
        },
      })
      await clearPendingSignupCookie()
      return NextResponse.json({ success: true, user: updated })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 })
      }
      throw error
    }
  } catch (error) {
    console.error("Complete account API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
