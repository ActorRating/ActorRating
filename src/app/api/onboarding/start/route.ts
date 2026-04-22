export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserId } from "@/lib/authUser"

export async function POST() {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.user.updateMany({
      where: {
        id: userId,
        status: { in: ["NEW", "ONBOARDING"] },
      },
      data: {
        status: "ONBOARDING",
        onboardingStartedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Onboarding start error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
