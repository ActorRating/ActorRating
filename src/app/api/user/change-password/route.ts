export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserId } from "@/lib/authUser"
import { validatePassword } from "@/lib/validation"

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body as { currentPassword?: string; newPassword?: string }

    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      )
    }

    const pwdCheck = validatePassword(newPassword)
    if (!pwdCheck.isValid) {
      return NextResponse.json({ error: pwdCheck.error }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    })
    if (!user?.password) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ok = await bcrypt.compare(currentPassword, user.password)
    if (!ok) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Password change error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
