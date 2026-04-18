export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserId } from "@/lib/authUser"

export async function POST(_request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Since terms fields were removed, just return success
    // This endpoint can be used for future terms logic if needed
    return NextResponse.json({ 
      success: true,
      message: "Terms acceptance recorded"
    })
  } catch (error) {
    console.error("Terms acceptance update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Since terms fields were removed, return default values
    return NextResponse.json({ 
      acceptedTerms: true,
      acceptedAt: new Date().toISOString(),
      termsVersion: "1.0"
    })
  } catch (error) {
    console.error("Terms acceptance get error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}