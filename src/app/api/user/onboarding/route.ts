export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserId } from "@/lib/authUser"

export async function POST(_request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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