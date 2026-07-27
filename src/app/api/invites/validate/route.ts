export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { assertInviteAvailable, isInviteGateEnabled } from "@/lib/invites"
import { checkRateLimit } from "@/lib/rateLimit"
import { getClientIp } from "@/lib/requestProtection"

/** Public check that an invite code is valid and unused. */
export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    const limit = await checkRateLimit(clientIp, "usernameCheck")
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const code = request.nextUrl.searchParams.get("code") ?? ""
    if (!isInviteGateEnabled()) {
      const check = code ? await assertInviteAvailable(code) : { ok: true as const }
      return NextResponse.json({
        gateEnabled: false,
        valid: check.ok,
        error: check.ok ? null : ("error" in check ? check.error : null),
      })
    }

    const check = await assertInviteAvailable(code)
    return NextResponse.json({
      gateEnabled: true,
      valid: check.ok,
      error: check.ok ? null : check.error,
    })
  } catch (error) {
    console.error("Invite validate error:", error)
    return NextResponse.json({ error: "Failed to validate invite" }, { status: 500 })
  }
}
