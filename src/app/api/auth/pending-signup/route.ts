export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rateLimit"
import { getClientIp } from "@/lib/requestProtection"
import {
  setPendingSignupCookie,
  type PendingSignupPayload,
} from "@/lib/auth/pendingSignup"
import { containsBadWord } from "@/lib/validation/sanitizeName"
import { isValidUsername, normalizeUsername } from "@/lib/validation/username"
import { validateEmail } from "@/lib/validation"

type Body = {
  username?: string
  email?: string
  termsAccepted?: boolean
}

/**
 * Stash username + terms before magic-link / Google OAuth so createUser can apply them.
 */
export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    const limit = await checkRateLimit(clientIp, "usernameCheck")
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const body = (await request.json()) as Body
    if (body.termsAccepted !== true) {
      return NextResponse.json({ error: "You must agree to the Terms" }, { status: 400 })
    }

    const username = normalizeUsername(body.username ?? "")
    if (!isValidUsername(username) || containsBadWord(username)) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 })
    }

    const taken = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })
    if (taken) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 })
    }

    const payload: PendingSignupPayload = {
      username,
      termsAccepted: true,
    }

    const rawEmail = body.email?.trim().toLowerCase()
    if (rawEmail) {
      const emailValidation = validateEmail(rawEmail)
      if (!emailValidation.isValid) {
        return NextResponse.json({ error: emailValidation.error || "Invalid email" }, { status: 400 })
      }
      payload.email = rawEmail
    }

    await setPendingSignupCookie(payload)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Pending signup API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
