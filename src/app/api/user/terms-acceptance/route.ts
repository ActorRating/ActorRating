export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUserId } from "@/lib/authUser"
import { prisma } from "@/lib/prisma"

export async function POST(_request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { termsAcceptedAt: new Date() },
      select: { termsAcceptedAt: true },
    })

    return NextResponse.json({
      success: true,
      acceptedTerms: true,
      acceptedAt: updated.termsAcceptedAt?.toISOString() ?? null,
      termsVersion: "1.0",
    })
  } catch (error) {
    console.error("Terms acceptance update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(_request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { termsAcceptedAt: true },
    })

    return NextResponse.json({
      acceptedTerms: Boolean(user?.termsAcceptedAt),
      acceptedAt: user?.termsAcceptedAt?.toISOString() ?? null,
      termsVersion: "1.0",
    })
  } catch (error) {
    console.error("Terms acceptance fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
