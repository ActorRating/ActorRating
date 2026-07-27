export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkRateLimitScopes } from "@/lib/rateLimit"
import { getClientIp } from "@/lib/requestProtection"
import { isDisposableEmail } from "@/lib/authGuards"
import { validateEmail } from "@/lib/validation"
import { AR_SRC_COOKIE, isValidSource } from "@/lib/tracking/source"

/**
 * Join the public waitlist (no invite required).
 */
export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    const limit = await checkRateLimitScopes({
      ip: clientIp,
      action: "profileUpdate",
    })
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const body = (await request.json()) as { email?: string }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
      return NextResponse.json({ error: emailValidation.error || "Invalid email" }, { status: 400 })
    }
    if (isDisposableEmail(email)) {
      return NextResponse.json({ error: "Please use a permanent email address" }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
    if (existingUser) {
      return NextResponse.json({
        success: true,
        alreadyMember: true,
        message: "You’re already on ActorRating — sign in instead.",
      })
    }

    const cookieSrc = request.cookies.get(AR_SRC_COOKIE)?.value ?? null
    const source = isValidSource(cookieSrc) ? cookieSrc : null

    await prisma.waitlistEntry.upsert({
      where: { email },
      create: { email, source },
      update: {},
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Waitlist join error:", error)
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 })
  }
}
