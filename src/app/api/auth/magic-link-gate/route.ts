export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { validateEmail } from "@/lib/validation"
import {
  MAGIC_LINK_GATE_COOKIE,
  createMagicLinkGateToken,
  getRequestIp,
  isDisposableEmail,
  magicLinkGateCookieOptions,
} from "@/lib/authGuards"
import {
  MAGIC_LINK_HONEYPOT_FIELD,
  isHoneypotTriggered,
} from "@/lib/auth/magicLinkHoneypot"

type Body = {
  email?: string
  [key: string]: unknown
}

/**
 * Pre-flight for magic-link sends:
 * - Honeypot (company_url) must be empty — bots get a fake success, no cookie
 * - Disposable domains rejected
 * - Sets a short-lived gate cookie required by EmailProvider.sendVerificationRequest
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body
    const honeypot = body[MAGIC_LINK_HONEYPOT_FIELD]

    // Silent success for bots that fill the trap field — no gate cookie issued.
    if (isHoneypotTriggered(honeypot)) {
      return NextResponse.json({ ok: true })
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: emailValidation.error || "Invalid email", code: "INVALID_EMAIL" },
        { status: 400 },
      )
    }

    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { error: "Please use a valid email provider.", code: "DISPOSABLE_EMAIL" },
        { status: 400 },
      )
    }

    // Touch IP for logging / future use (rate limit still applied at send time).
    void getRequestIp(request)

    const response = NextResponse.json({ ok: true })
    response.cookies.set(
      MAGIC_LINK_GATE_COOKIE,
      createMagicLinkGateToken(email),
      magicLinkGateCookieOptions(),
    )
    return response
  } catch (error) {
    console.error("Magic link gate error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
