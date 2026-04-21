export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserId } from "@/lib/authUser"
import { getClientIp } from "@/lib/requestProtection"
import { checkRateLimitScopes } from "@/lib/rateLimit"

export async function POST(_request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const clientIp = getClientIp(_request)
    const limit = await checkRateLimitScopes({
      ip: clientIp,
      action: "onboardingComplete",
      userId,
    })
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    // Since onboarding fields were removed, just return success
    // This endpoint can be used for future onboarding logic if needed
    return NextResponse.json({
      success: true,
      message: "Onboarding completed",
    })
  } catch (error) {
    console.error("Onboarding API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 