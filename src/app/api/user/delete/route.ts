export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserId } from "@/lib/authUser"

export async function DELETE(_request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      await prisma.rating.deleteMany({ where: { userId } })
      await prisma.performance.deleteMany({ where: { userId } })
    } catch {
      // proceed
    }

    await prisma.user.deleteMany({ where: { id: userId } })

    return NextResponse.json({ success: true, message: "Account deleted successfully" })
  } catch (error) {
    console.error("Account deletion error:", error)

    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
