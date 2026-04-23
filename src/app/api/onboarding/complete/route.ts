export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function POST() {
  try {
    const session = await auth()
    const email = session?.user?.email?.toLowerCase().trim()
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.user.updateMany({
      where: { email },
      data: {
        onboardingCompleted: true,
        onboardingStartedAt: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Onboarding completion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
